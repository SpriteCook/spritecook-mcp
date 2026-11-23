import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  ANTIGRAVITY_PLUGIN_URL,
  installAntigravityPlugin,
  removeLegacyAntigravityEntries,
} from '../src/antigravity.mjs';

function makeHome() {
  return mkdtempSync(join(tmpdir(), 'spritecook-agy-'));
}

function writeJson(path, value) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf-8');
}

const legacyEntry = {
  serverUrl: 'https://api.spritecook.ai/mcp/',
  headers: { Authorization: 'Bearer sc_live_test' },
};


test('installs with the agy CLI when it is available', () => {
  const home = makeHome();
  const calls = [];
  try {
    const path = installAntigravityPlugin({
      home,
      run: (command, args) => { calls.push([command, ...args]); return true; },
    });
    assert.deepEqual(calls, [['agy', 'plugin', 'install', ANTIGRAVITY_PLUGIN_URL]]);
    assert.equal(path, join(home, '.gemini', 'config', 'plugins', 'spritecook'));
    assert.equal(existsSync(join(home, '.gemini', 'config', 'mcp_config.json')), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});


test('falls back to git clone into the global plugins folder', () => {
  const home = makeHome();
  const calls = [];
  try {
    const path = installAntigravityPlugin({
      home,
      run: (command, args) => { calls.push([command, ...args]); return command === 'git'; },
    });
    const pluginDir = join(home, '.gemini', 'config', 'plugins', 'spritecook');
    assert.equal(path, pluginDir);
    assert.deepEqual(calls[1], ['git', 'clone', '--depth', '1', ANTIGRAVITY_PLUGIN_URL, pluginDir]);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});


test('writes an OAuth MCP entry without an API key when nothing else works', () => {
  const home = makeHome();
  const previousApiUrl = process.env.SPRITECOOK_API_URL;
  process.env.SPRITECOOK_API_URL = 'https://example.test';
  try {
    const path = installAntigravityPlugin({ home, run: () => false });
    assert.equal(path, join(home, '.gemini', 'config', 'mcp_config.json'));
    const config = JSON.parse(readFileSync(path, 'utf-8'));
    assert.deepEqual(config.mcpServers.spritecook, { serverUrl: 'https://example.test/mcp/oauth' });
    assert.doesNotMatch(readFileSync(path, 'utf-8'), /Authorization|Bearer|sc_live_/);
  } finally {
    if (previousApiUrl === undefined) delete process.env.SPRITECOOK_API_URL;
    else process.env.SPRITECOOK_API_URL = previousApiUrl;
    rmSync(home, { recursive: true, force: true });
  }
});


test('removes old API key entries from both config paths and keeps other servers', () => {
  const home = makeHome();
  const current = join(home, '.gemini', 'config', 'mcp_config.json');
  const legacy = join(home, '.gemini', 'antigravity', 'mcp_config.json');
  writeJson(current, { mcpServers: { spritecook: legacyEntry, other: { serverUrl: 'https://other.example' } } });
  writeJson(legacy, { mcpServers: { spritecook: legacyEntry } });

  try {
    const changed = removeLegacyAntigravityEntries(home);
    assert.deepEqual(changed.sort(), [current, legacy].sort());
    const kept = JSON.parse(readFileSync(current, 'utf-8'));
    assert.deepEqual(Object.keys(kept.mcpServers), ['other']);
    assert.doesNotMatch(readFileSync(legacy, 'utf-8'), /sc_live_/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});


test('leaves a non-SpriteCook entry named spritecook alone', () => {
  const home = makeHome();
  const current = join(home, '.gemini', 'config', 'mcp_config.json');
  writeJson(current, { mcpServers: { spritecook: { command: 'my-local-server' } } });
  try {
    assert.deepEqual(removeLegacyAntigravityEntries(home), []);
    assert.equal(JSON.parse(readFileSync(current, 'utf-8')).mcpServers.spritecook.command, 'my-local-server');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
