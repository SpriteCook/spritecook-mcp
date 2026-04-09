import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { success, warn, info } from './ui.mjs';
import { getMcpUrl } from './config.mjs';

// ── Read existing key ───────────────────────────────────────────────────

/**
 * Try to read an existing SpriteCook API key from any detected editor config.
 * Returns the key string or null if none found.
 */
export function readExistingKey() {
  const cwd = process.cwd();
  const home = homedir();

  const keyFrom = (config, ...path) => {
    let obj = config;
    for (const p of path) { obj = obj?.[p]; }
    if (typeof obj === 'string' && obj.startsWith('Bearer sc_live_')) {
      return obj.replace('Bearer ', '');
    }
    return null;
  };

  const tryFile = (filePath, ...keyPath) => {
    try {
      if (!existsSync(filePath)) return null;
      const config = JSON.parse(readFileSync(filePath, 'utf-8'));
      return keyFrom(config, ...keyPath);
    } catch { return null; }
  };

  // Cursor project
  const k1 = tryFile(join(cwd, '.cursor', 'mcp.json'), 'mcpServers', 'spritecook', 'headers', 'Authorization');
  if (k1) return k1;
  // Cursor global
  const k1g = tryFile(join(home, '.cursor', 'mcp.json'), 'mcpServers', 'spritecook', 'headers', 'Authorization');
  if (k1g) return k1g;

  // VS Code project (new mcp.json format)
  const k2 = tryFile(join(cwd, '.vscode', 'mcp.json'), 'servers', 'spritecook', 'headers', 'Authorization');
  if (k2) return k2;
  // VS Code legacy (settings.json)
  const k2b = tryFile(join(cwd, '.vscode', 'settings.json'), 'mcp', 'servers', 'spritecook', 'headers', 'Authorization');
  if (k2b) return k2b;

  // Claude Desktop
  const claudeDesktop = getClaudeDesktopConfigPath();
  if (claudeDesktop) {
    const k3 = tryFile(claudeDesktop, 'mcpServers', 'spritecook', 'headers', 'Authorization');
    if (k3) return k3;
  }

  // Claude Code
  const k4a = tryFile(join(home, '.claude', 'settings.json'), 'mcpServers', 'spritecook', 'headers', 'Authorization');
  if (k4a) return k4a;
  const k4b = tryFile(join(home, '.claude.json'), 'mcpServers', 'spritecook', 'headers', 'Authorization');
  if (k4b) return k4b;

  // Antigravity
  const antigravity = getAntigravityConfigPath();
  const k5 = tryFile(antigravity, 'mcpServers', 'spritecook', 'headers', 'Authorization');
  if (k5) return k5;

  // Windsurf
  const windsurf = getWindsurfConfigPath();
  if (windsurf) {
    const k6 = tryFile(windsurf, 'mcpServers', 'spritecook', 'headers', 'Authorization');
    if (k6) return k6;
  }

  // Codex (TOML - just search for the key string)
  try {
    const codexGlobal = join(home, '.codex', 'config.toml');
    const codexProject = join(cwd, '.codex', 'config.toml');
    for (const p of [codexProject, codexGlobal]) {
      if (existsSync(p)) {
        const text = readFileSync(p, 'utf-8');
        const match = text.match(/bearer_token\s*=\s*"(sc_live_[^"]+)"/);
        if (match) return match[1];
      }
    }
  } catch { /* ignore */ }

  return null;
}

// ── Environment detection ───────────────────────────────────────────────

function isRunningInCursor() {
  const env = process.env;
  if (env.CURSOR_CHANNEL) return true;
  if (env.TERM_PROGRAM === 'cursor') return true;
  const ipcHandle = env.VSCODE_GIT_IPC_HANDLE || env.VSCODE_IPC_HOOK_CLI || '';
  if (ipcHandle.toLowerCase().includes('cursor')) return true;
  return false;
}

function isRunningInAntigravity() {
  const env = process.env;
  if (env.ANTIGRAVITY_CHANNEL) return true;
  if (env.TERM_PROGRAM === 'antigravity') return true;
  const ipcHandle = env.VSCODE_GIT_IPC_HANDLE || env.VSCODE_IPC_HOOK_CLI || '';
  if (ipcHandle.toLowerCase().includes('antigravity')) return true;
  return false;
}

function isRunningInVSCode() {
  const env = process.env;
  if (env.TERM_PROGRAM === 'vscode') return true;
  if (env.VSCODE_PID) return true;
  if (env.VSCODE_GIT_IPC_HANDLE) return true;
  if (env.VSCODE_IPC_HOOK_CLI) return true;
  return false;
}

function isRunningInWindsurf() {
  const env = process.env;
  if (env.TERM_PROGRAM === 'windsurf') return true;
  const ipcHandle = env.VSCODE_GIT_IPC_HANDLE || env.VSCODE_IPC_HOOK_CLI || '';
  if (ipcHandle.toLowerCase().includes('windsurf') || ipcHandle.toLowerCase().includes('codeium')) return true;
  return false;
}

// ── Editor definitions ──────────────────────────────────────────────────

/**
 * Each editor defines:
 *  - name: display name
 *  - detected: boolean heuristic
 *  - scopes: available MCP scopes ('project' and/or 'global')
 *  - defaultScope: recommended default scope
 *  - write(apiKey, scope): writer function
 *  - configPath(scope): return the path that will be written
 *  - skillDirs: { project, global } paths for skill installation
 */
export function detectEditors() {
  const cwd = process.cwd();
  const home = homedir();
  const editors = [];

  const inCursor = isRunningInCursor();
  const inVSCode = isRunningInVSCode() && !inCursor && !isRunningInAntigravity() && !isRunningInWindsurf();
  const inAntigravity = isRunningInAntigravity();
  const inWindsurf = isRunningInWindsurf();

  // ── Cursor ──────────────────────────────────────────────────
  editors.push({
    name: 'Cursor',
    detected: existsSync(join(cwd, '.cursor')) || inCursor,
    scopes: ['project', 'global'],
    defaultScope: 'project',
    configPath: (scope) => scope === 'global'
      ? join(home, '.cursor', 'mcp.json')
      : join(cwd, '.cursor', 'mcp.json'),
    write: (apiKey, scope) => writeCursorConfig(
      scope === 'global' ? join(home, '.cursor') : join(cwd, '.cursor'),
      apiKey
    ),
    skillDirs: {
      project: join(cwd, '.cursor', 'skills', 'spritecook'),
      global: join(home, '.cursor', 'skills', 'spritecook'),
    },
  });

  // ── VS Code ─────────────────────────────────────────────────
  // Skills: project .github/skills/, global ~/.copilot/skills/
  editors.push({
    name: 'VS Code',
    detected: existsSync(join(cwd, '.vscode')) || inVSCode,
    scopes: ['project', 'global'],
    defaultScope: 'project',
    configPath: (scope) => scope === 'global'
      ? getVSCodeGlobalMcpPath()
      : join(cwd, '.vscode', 'mcp.json'),
    write: (apiKey, scope) => scope === 'global'
      ? writeVSCodeGlobalConfig(apiKey)
      : writeVSCodeProjectConfig(join(cwd, '.vscode'), apiKey),
    skillDirs: {
      project: join(cwd, '.github', 'skills', 'spritecook'),
      global: join(home, '.copilot', 'skills', 'spritecook'),
    },
  });

  // ── Claude Desktop ──────────────────────────────────────────
  const claudeDesktopPath = getClaudeDesktopConfigPath();
  editors.push({
    name: 'Claude Desktop',
    detected: claudeDesktopPath ? existsSync(join(claudeDesktopPath, '..')) : false,
    scopes: ['global'],
    defaultScope: 'global',
    configPath: () => claudeDesktopPath,
    write: (apiKey) => writeClaudeDesktopConfig(claudeDesktopPath, apiKey),
    skillDirs: {
      project: join(cwd, '.claude', 'skills', 'spritecook'),
      global: join(home, '.claude', 'skills', 'spritecook'),
    },
  });

  // ── Claude Code ─────────────────────────────────────────────
  // MCP servers are always stored in ~/.claude.json (not ~/.claude/settings.json).
  // Detection: check both files, but always write MCP config to ~/.claude.json.
  const claudeCodeMcpPath = join(home, '.claude.json');
  const claudeCodeSettingsPath = join(home, '.claude', 'settings.json');
  const claudeCodeDetected = existsSync(claudeCodeMcpPath) || existsSync(claudeCodeSettingsPath);
  editors.push({
    name: 'Claude Code',
    detected: claudeCodeDetected,
    scopes: ['global'],
    defaultScope: 'global',
    configPath: () => claudeCodeMcpPath,
    write: (apiKey) => writeClaudeCodeConfig(claudeCodeMcpPath, apiKey),
    skillDirs: {
      project: join(cwd, '.claude', 'skills', 'spritecook'),
      global: join(home, '.claude', 'skills', 'spritecook'),
    },
  });

  // ── Antigravity (Google) ────────────────────────────────────
  const antigravityPath = getAntigravityConfigPath();
  editors.push({
    name: 'Antigravity',
    detected: inAntigravity || (antigravityPath ? existsSync(join(antigravityPath, '..')) : false),
    scopes: ['global'],
    defaultScope: 'global',
    configPath: () => antigravityPath,
    write: (apiKey) => writeAntigravityConfig(antigravityPath, apiKey),
    skillDirs: {
      project: join(cwd, '.agent', 'skills', 'spritecook'),
      global: join(home, '.gemini', 'antigravity', 'skills', 'spritecook'),
    },
  });

  // ── Windsurf (Codeium) ──────────────────────────────────────
  const windsurfPath = getWindsurfConfigPath();
  editors.push({
    name: 'Windsurf',
    detected: inWindsurf || (windsurfPath ? existsSync(join(windsurfPath, '..')) : false),
    scopes: ['global'],
    defaultScope: 'global',
    configPath: () => windsurfPath,
    write: (apiKey) => writeWindsurfConfig(windsurfPath, apiKey),
    skillDirs: {
      project: null, // Windsurf uses Cascade / AGENTS.md, no standard skills dir
      global: null,
    },
  });

  // ── Codex (OpenAI) ──────────────────────────────────────────
  // Always write to global ~/.codex/config.toml regardless of scope choice.
  // Project-level config requires Codex "trusted project" which is unreliable
  // for new projects, and global keeps the API key out of git.
  const codexGlobalPath = join(home, '.codex', 'config.toml');
  const codexProjectPath = join(cwd, '.codex', 'config.toml');
  editors.push({
    name: 'Codex',
    detected: existsSync(codexGlobalPath) || existsSync(codexProjectPath),
    scopes: ['global'],
    defaultScope: 'global',
    configPath: () => codexGlobalPath,
    write: (apiKey) => writeCodexConfig(codexGlobalPath, apiKey),
    skillDirs: {
      project: join(cwd, '.agents', 'skills', 'spritecook'),
      global: join(home, '.agents', 'skills', 'spritecook'),
    },
  });

  return editors;
}

/**
 * Write MCP config for all selected editors.
 * Creates config directories if they don't exist.
 * Returns the count of configs successfully written.
 */
export function writeConfigs(editors, apiKey) {
  let written = 0;

  for (const editor of editors) {
    try {
      const scope = editor._chosenScope || editor.defaultScope;
      editor.write(apiKey, scope);
      const path = typeof editor.configPath === 'function' ? editor.configPath(scope) : editor.configPath;
      success(`${path}`);
      written++;
    } catch (err) {
      warn(`Failed to write ${editor.name} config: ${err.message}`);
    }
  }

  return written;
}

// ── Writer Functions ────────────────────────────────────────────────────

function writeCursorConfig(cursorDir, apiKey) {
  const configPath = join(cursorDir, 'mcp.json');
  const mcpUrl = getMcpUrl();

  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* start fresh */ }
  }

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.spritecook = {
    url: mcpUrl,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  ensureDir(cursorDir);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function writeVSCodeProjectConfig(vscodeDir, apiKey) {
  // VS Code now uses .vscode/mcp.json with root key "servers"
  const configPath = join(vscodeDir, 'mcp.json');
  const mcpUrl = getMcpUrl();

  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* start fresh */ }
  }

  if (!config.servers) config.servers = {};
  config.servers.spritecook = {
    type: 'http',
    url: mcpUrl,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  ensureDir(vscodeDir);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function writeVSCodeGlobalConfig(apiKey) {
  const configPath = getVSCodeGlobalMcpPath();
  const mcpUrl = getMcpUrl();

  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* start fresh */ }
  }

  if (!config.servers) config.servers = {};
  config.servers.spritecook = {
    type: 'http',
    url: mcpUrl,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  ensureDir(join(configPath, '..'));
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function writeClaudeDesktopConfig(configPath, apiKey) {
  if (!configPath) { warn('Claude Desktop config path not found.'); return; }
  const mcpUrl = getMcpUrl();

  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* start fresh */ }
  }

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.spritecook = {
    url: mcpUrl,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  ensureDir(join(configPath, '..'));
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function writeClaudeCodeConfig(configPath, apiKey) {
  const mcpUrl = getMcpUrl();

  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* start fresh */ }
  }

  // Claude Code requires "type": "http" for remote servers
  // Config lives in ~/.claude.json per https://docs.anthropic.com/en/docs/claude-code/mcp
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.spritecook = {
    type: 'http',
    url: mcpUrl,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  ensureDir(join(configPath, '..'));
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function writeAntigravityConfig(configPath, apiKey) {
  if (!configPath) { warn('Antigravity config path not found.'); return; }
  const mcpUrl = getMcpUrl();

  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* start fresh */ }
  }

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.spritecook = {
    serverUrl: mcpUrl,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  ensureDir(join(configPath, '..'));
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function writeWindsurfConfig(configPath, apiKey) {
  if (!configPath) { warn('Windsurf config path not found.'); return; }
  const mcpUrl = getMcpUrl();

  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf-8')); } catch { /* start fresh */ }
  }

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.spritecook = {
    url: mcpUrl,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  ensureDir(join(configPath, '..'));
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function writeCodexConfig(configPath, apiKey) {
  const mcpUrl = getMcpUrl();

  // Read existing or start fresh TOML
  let content = '';
  if (existsSync(configPath)) {
    try { content = readFileSync(configPath, 'utf-8'); } catch { /* start fresh */ }
  }

  // Remove any existing [mcp_servers.spritecook] block (including sub-tables)
  content = content.replace(/\[mcp_servers\.spritecook[^\]]*\][^\[]*/g, '');

  // Codex uses Streamable HTTP format per https://developers.openai.com/codex/mcp/
  // - url: required, the server address
  // - http_headers: map of header names to static values (for auth)
  const block = [
    '',
    '[mcp_servers.spritecook]',
    `url = "${mcpUrl}"`,
    '',
    '[mcp_servers.spritecook.http_headers]',
    `Authorization = "Bearer ${apiKey}"`,
    '',
  ].join('\n');

  content = content.trimEnd() + '\n' + block;

  ensureDir(join(configPath, '..'));
  writeFileSync(configPath, content, 'utf-8');
}

// ── Path Helpers ────────────────────────────────────────────────────────

function getAntigravityConfigPath() {
  return join(homedir(), '.gemini', 'antigravity', 'mcp_config.json');
}

function getClaudeDesktopConfigPath() {
  const platform = process.platform;
  const home = homedir();

  if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  if (platform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    return join(appData, 'Claude', 'claude_desktop_config.json');
  }
  if (platform === 'linux') {
    return join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }
  return null;
}

function getWindsurfConfigPath() {
  const platform = process.platform;
  const home = homedir();

  if (platform === 'darwin') {
    return join(home, '.codeium', 'windsurf', 'mcp_config.json');
  }
  if (platform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    return join(appData, 'Codeium', 'Windsurf', 'mcp_config.json');
  }
  if (platform === 'linux') {
    // Try both common paths
    const p1 = join(home, '.codeium', 'windsurf', 'mcp_config.json');
    const p2 = join(home, '.config', 'Codeium', 'Windsurf', 'mcp_config.json');
    if (existsSync(p2)) return p2;
    return p1;
  }
  return null;
}

function getVSCodeGlobalMcpPath() {
  const platform = process.platform;
  const home = homedir();

  if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
  }
  if (platform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    return join(appData, 'Code', 'User', 'mcp.json');
  }
  if (platform === 'linux') {
    return join(home, '.config', 'Code', 'User', 'mcp.json');
  }
  return join(home, '.vscode', 'mcp.json'); // fallback
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
