import chalk from 'chalk';
import prompts from 'prompts';
import { printBanner, step, success, info, warn, error } from './ui.mjs';
import { authenticate } from './auth.mjs';
import { verifyApiKey } from './verify.mjs';
import { detectEditors, writeConfigs, readExistingKey } from './editors.mjs';
import { maybeInstallSkill } from './skill.mjs';

/**
 * Main setup flow orchestrator.
 * Called by bin/cli.mjs as the entry point.
 */
export async function run() {
  printBanner();

  // ── Step 1: Select clients ────────────────────────────────────────
  step(1, 'Client Configuration');
  const editors = detectEditors();
  const editorResponse = await prompts({
    type: 'multiselect',
    name: 'editors',
    message: 'Configure MCP for:',
    choices: editors.map((e) => ({
      title: e.detected ? chalk.white(e.name) : chalk.dim(e.name),
      value: e.name,
      selected: e.detected,
    })),
    hint: 'Space to toggle, Enter to confirm',
    instructions: false,
  });
  const selected = editors.filter((e) => editorResponse.editors?.includes(e.name));

  // ── Step 2: Authenticate API-key clients ─────────────────────────
  step(2, 'Authentication');
  const apiKeyEditors = selected.filter((editor) => editor.authMode !== 'oauth');
  let apiKey = null;

  if (selected.length === 0) {
    info('No client selected, so authentication is not required.');
  } else if (apiKeyEditors.length === 0) {
    info('OAuth clients will open SpriteCook sign-in on first use and refresh tokens automatically.');
  } else {
    // Check if there's already a working SpriteCook key in an editor config.
    const existingKey = readExistingKey();
    if (existingKey) {
      info('Found existing SpriteCook API key in your editor config.');
      const verification = await verifyApiKey(existingKey);
      if (verification.ok) {
        const response = await prompts({
          type: 'select',
          name: 'action',
          message: 'Existing key is valid. What would you like to do?',
          choices: [
            { title: 'Keep existing key and update configs', value: 'keep' },
            { title: 'Create a new key (replaces current)', value: 'new' },
          ],
          initial: 0,
        });

        if (response.action === 'keep') {
          apiKey = existingKey;
          success('Using existing API key.');
        }
      } else {
        warn('Existing key is no longer valid. Please authenticate again.');
      }
    }

    if (!apiKey) {
      apiKey = await authenticate();
      if (!apiKey) {
        console.log();
        error('Setup cancelled. No API key obtained.');
        process.exit(1);
      }

      const verification = await verifyApiKey(apiKey);
      if (!verification.ok) {
        error('API key verification failed. Please check your key and try again.');
        process.exit(1);
      }
    }
  }

  // ── Step 3: Detect editors and write configs ──────────────────────
  step(3, 'Editor Configuration');

  if (selected.length === 0) {
    warn('No editors selected. Skipping config.');
  } else {
    // Ask about scope for editors that support both project and global
    const multiScopeEditors = selected.filter((e) => e.scopes.length > 1);
    if (multiScopeEditors.length > 0) {
      console.log();
      const scopeResponse = await prompts({
        type: 'select',
        name: 'scope',
        message: 'Install MCP config:',
        choices: [
          { title: 'This project only (recommended)', value: 'project', description: 'Writes to project config files' },
          { title: 'Global (all projects)', value: 'global', description: 'Writes to user-level config' },
        ],
        initial: 0,
      });

      const chosenScope = scopeResponse.scope || 'project';
      for (const e of selected) {
        if (e.scopes.includes(chosenScope)) {
          e._chosenScope = chosenScope;
        }
        // Editors with only 1 scope keep their default
      }
    }

    console.log();
    info('Writing MCP config...');
    const written = writeConfigs(selected, apiKey);

    if (written === 0) {
      warn('No configs were written. You may need to configure manually.');
    }
  }

  // ── Step 4: Optional agent skill ─────────────────────────────────
  step(4, 'Agent Skill (optional)');
  await maybeInstallSkill(selected);

  // ── Done ──────────────────────────────────────────────────────────
  const configuredNames = selected.map((e) => e.name);
  const hasCursor = configuredNames.includes('Cursor');
  const hasVSCode = configuredNames.includes('VS Code');
  const hasGrok = configuredNames.includes('Grok Build');

  console.log();
  console.log(chalk.bold.green('  Setup complete!'));
  console.log();

  if (hasCursor || hasVSCode || hasGrok) {
    console.log(chalk.bgYellow.black.bold('  ACTION REQUIRED  '));
    console.log();
    if (hasCursor) {
      console.log(chalk.white.bold('  Cursor:'));
      console.log(chalk.white('    1. Open Settings (Ctrl+Shift+J / Cmd+Shift+J)'));
      console.log(chalk.white('    2. Go to Tools & MCP'));
      console.log(chalk.white('    3. Enable "spritecook"'));
    }
    if (hasVSCode) {
      if (hasCursor) console.log();
      console.log(chalk.white.bold('  VS Code:'));
      console.log(chalk.white('    Reload the window (Ctrl+Shift+P > "Reload Window")'));
    }
    if (hasGrok) {
      if (hasCursor || hasVSCode) console.log();
      console.log(chalk.white.bold('  Grok Build:'));
      console.log(chalk.white('    1. Open /mcps and authenticate "spritecook"'));
      console.log(chalk.white('    2. Run "grok mcp doctor spritecook" if tools do not appear'));
    }
    console.log();
    console.log(chalk.dim('  ─────────────────────────────────────────'));
  }

  console.log();
  console.log(chalk.dim('  Then try asking your AI agent:'));
  console.log(chalk.white('  "Generate a chicken sprite"'));
  console.log();
}
