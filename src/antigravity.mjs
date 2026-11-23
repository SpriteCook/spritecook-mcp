import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { info, warn } from './ui.mjs';
import { getMcpOAuthUrl } from './config.mjs';

// Antigravity (Google) gets the SpriteCook plugin, which bundles the hosted
// MCP server and the workflow skills. Antigravity runs the OAuth sign-in and
// refreshes tokens itself, so no API key is ever written for it.

export const ANTIGRAVITY_PLUGIN_URL = 'https://github.com/SpriteCook/antigravity-plugin';

/** ~/.gemini/config holds plugins, skills and mcp_config.json since Antigravity 2.x. */
export function getAntigravityConfigDir(home = homedir()) {
  return join(home, '.gemini', 'config');
}

export function getAntigravityPluginDir(home = homedir()) {
  return join(getAntigravityConfigDir(home), 'plugins', 'spritecook');
}

/** MCP config files Antigravity has used: the current one and the pre-2.x one. */
export function getAntigravityMcpConfigPaths(home = homedir()) {
  return [
    join(getAntigravityConfigDir(home), 'mcp_config.json'),
    join(home, '.gemini', 'antigravity', 'mcp_config.json'),
  ];
}

function isSpriteCookEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const url = String(entry.serverUrl || entry.url || entry.httpUrl || '');
  return url.includes('spritecook');
}

/**
 * Remove a `spritecook` MCP entry that an older setup wrote (API key in a
 * header). With the plugin installed it would load the same tools twice and
 * keep a long-lived key on disk. Other servers in the file are left alone.
 * Returns the paths that were changed.
 */
export function removeLegacyAntigravityEntries(home = homedir()) {
  const changed = [];
  const seen = new Set();

  for (const path of getAntigravityMcpConfigPaths(home)) {
    if (!existsSync(path)) continue;
    let real = path;
    try { real = realpathSync(path); } catch { /* keep the given path */ }
    if (seen.has(real)) continue;
    seen.add(real);

    let config;
    try { config = JSON.parse(readFileSync(path, 'utf-8')); } catch { continue; }
    if (!isSpriteCookEntry(config?.mcpServers?.spritecook)) continue;

    delete config.mcpServers.spritecook;
    writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    changed.push(path);
  }

  return changed;
}

/**
 * Write a plain OAuth MCP entry. Only used when the plugin can't be installed
 * (no `agy` CLI and no git): the tools still work, without the bundled skills.
 */
export function writeAntigravityOAuthConfig(configPath) {
  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* start fresh */ }
  }
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.spritecook = { serverUrl: getMcpOAuthUrl() };

  mkdirSync(join(configPath, '..'), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function defaultRun(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', timeout: 120_000 });
  return !result.error && result.status === 0;
}

/**
 * Install or update the SpriteCook plugin for Antigravity.
 *
 * 1. `agy plugin install <repo>` (the Antigravity CLI, which also enables it)
 * 2. `git clone` into ~/.gemini/config/plugins/spritecook (or `git pull` there)
 * 3. Last resort: an OAuth MCP entry in ~/.gemini/config/mcp_config.json
 *
 * Returns the path to report back to the user.
 * `run(command, args)` is injectable for tests and returns true on success.
 */
export function installAntigravityPlugin({ home = homedir(), run = defaultRun } = {}) {
  const pluginDir = getAntigravityPluginDir(home);

  const removed = removeLegacyAntigravityEntries(home);
  for (const path of removed) {
    info(`Removed the old SpriteCook API key entry from ${path}`);
  }

  if (run('agy', ['plugin', 'install', ANTIGRAVITY_PLUGIN_URL])) {
    return pluginDir;
  }

  if (existsSync(join(pluginDir, '.git'))) {
    if (run('git', ['-C', pluginDir, 'pull', '--ff-only'])) return pluginDir;
  } else if (!existsSync(pluginDir)) {
    mkdirSync(join(pluginDir, '..'), { recursive: true });
    if (run('git', ['clone', '--depth', '1', ANTIGRAVITY_PLUGIN_URL, pluginDir])) return pluginDir;
  } else if (existsSync(join(pluginDir, 'plugin.json'))) {
    // Already installed some other way; leave it as it is.
    return pluginDir;
  }

  const [configPath] = getAntigravityMcpConfigPaths(home);
  warn('Could not install the Antigravity plugin, so only the MCP server was added (no skills).');
  warn(`Install the full plugin later with: agy plugin install ${ANTIGRAVITY_PLUGIN_URL}`);
  writeAntigravityOAuthConfig(configPath);
  return configPath;
}
