import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { writeGrokConfig } from '../src/editors.mjs';


test('writeGrokConfig uses host-managed OAuth without writing an API key', () => {
  const root = mkdtempSync(join(tmpdir(), 'spritecook-grok-'));
  const configPath = join(root, '.grok', 'config.toml');
  const previousApiUrl = process.env.SPRITECOOK_API_URL;
  process.env.SPRITECOOK_API_URL = 'https://example.test';

  try {
    writeGrokConfig(configPath);
    const content = readFileSync(configPath, 'utf-8');
    assert.match(content, /\[mcp_servers\.spritecook\]/);
    assert.match(content, /url = "https:\/\/example\.test\/mcp\/oauth"/);
    assert.match(content, /enabled = true/);
    assert.doesNotMatch(content, /Authorization|Bearer|sc_live_/);
  } finally {
    if (previousApiUrl === undefined) delete process.env.SPRITECOOK_API_URL;
    else process.env.SPRITECOOK_API_URL = previousApiUrl;
    rmSync(root, { recursive: true, force: true });
  }
});


test('writeGrokConfig replaces only the existing SpriteCook block', () => {
  const root = mkdtempSync(join(tmpdir(), 'spritecook-grok-'));
  const configPath = join(root, 'config.toml');
  writeFileSync(
    configPath,
    '[models]\ndefault = "grok-build"\n\n[mcp_servers.spritecook]\nurl = "https://old.example/mcp"\n\n',
    'utf-8',
  );

  try {
    writeGrokConfig(configPath);
    const content = readFileSync(configPath, 'utf-8');
    assert.match(content, /\[models\]\ndefault = "grok-build"/);
    assert.equal((content.match(/\[mcp_servers\.spritecook\]/g) || []).length, 1);
    assert.doesNotMatch(content, /old\.example/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
