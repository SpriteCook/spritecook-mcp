import { execSync } from 'node:child_process';
import { platform } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import prompts from 'prompts';
import { success, info, warn } from './ui.mjs';

const SKILLS = [
  {
    name: 'spritecook-workflow-essentials',
    rawUrl: 'https://raw.githubusercontent.com/SpriteCook/skills/main/skills/spritecook-workflow-essentials/SKILL.md',
  },
  {
    name: 'spritecook-generate-sprites',
    rawUrl: 'https://raw.githubusercontent.com/SpriteCook/skills/main/skills/spritecook-generate-sprites/SKILL.md',
  },
  {
    name: 'spritecook-animate-assets',
    rawUrl: 'https://raw.githubusercontent.com/SpriteCook/skills/main/skills/spritecook-animate-assets/SKILL.md',
  },
];

/**
 * Download SKILL.md directly from GitHub and write it into each
 * selected editor's skill directory.  Used as a fallback when
 * `npx skills add` fails (e.g. git not installed).
 *
 * @param {Array<{skillDirs:{project:string|null,global:string|null}, _chosenScope?:string}>} editors
 */
async function fallbackInstall(editors) {
  info('Trying direct download fallback...');

  const skillBodies = [];
  try {
    for (const skill of SKILLS) {
      const res = await fetch(skill.rawUrl);
      if (!res.ok) throw new Error(`${skill.name}: HTTP ${res.status}`);
      skillBodies.push({
        name: skill.name,
        body: await res.text(),
      });
    }
  } catch (e) {
    warn(`Could not download skill files: ${e.message}`);
    return false;
  }

  let wrote = 0;
  for (const editor of editors) {
    const dirs = editor.skillDirs;
    if (!dirs) continue;

    const scope = editor._chosenScope || 'project';
    const dir = dirs[scope] || dirs.project || dirs.global;
    if (!dir) continue;

    const skillsRoot = basename(dir) === 'spritecook' ? dirname(dir) : dir;

    try {
      for (const skill of skillBodies) {
        const skillDir = join(skillsRoot, skill.name);
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, 'SKILL.md'), skill.body, 'utf-8');
        wrote++;
      }
    } catch {
      // best-effort, skip on failure
    }
  }

  if (wrote > 0) {
    success(`Agent skills installed via direct download (${wrote} files written).`);
    return true;
  }
  return false;
}

/**
 * Install or update the SpriteCook agent skill.
 *
 * Primary: `npx skills add SpriteCook/skills --skill '*'` (requires git).
 * Fallback: download SKILL.md directly from GitHub and place it
 *           in each selected editor's skill directory.
 *
 * @param {Array} [selectedEditors] - editors the user chose in step 3
 */
export async function maybeInstallSkill(selectedEditors = []) {
  info('The agent skill teaches your AI how to generate sprites autonomously.');
  const response = await prompts({
    type: 'confirm',
    name: 'install',
    message: 'Install SpriteCook agent skill? (highly recommended)',
    initial: true,
  });

  if (!response.install) {
    return;
  }

  info('Installing skills via npx skills add SpriteCook/skills --skill "*" ...');

  try {
    const npxCmd = platform() === 'win32' ? 'npx.cmd' : 'npx';
    execSync(`${npxCmd} -y skills add SpriteCook/skills --skill "*"`, {
      stdio: 'inherit',
      timeout: 60_000,
    });
    success('Agent skills installed.');
    return;
  } catch {
    // Primary method failed -- try fallback
  }

  // ── Fallback: direct download ────────────────────────────────────
  if (selectedEditors.length > 0) {
    const ok = await fallbackInstall(selectedEditors);
    if (ok) return;
  }

  warn('Skill install failed (git may not be installed).');
  console.log('  You can install it manually later:');
  console.log('    npx skills add SpriteCook/skills --skill "*"');
  console.log('  Or install git and re-run this setup.');
}
