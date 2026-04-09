import prompts from 'prompts';
import open from 'open';
import { spinner, error, info } from './ui.mjs';
import { getApiBase } from './config.mjs';

/**
 * Authenticate via the browser-based device authorization flow.
 * Returns the raw API key string on success, or null on failure.
 */
export async function deviceFlow() {
  const apiBase = getApiBase();

  // Step 1: Start a device auth session
  let session;
  try {
    const res = await fetch(`${apiBase}/v1/api/device-auth/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text();
      error(`Failed to start device auth: ${res.status} ${body}`);
      return null;
    }
    session = await res.json();
  } catch (err) {
    error(`Could not connect to SpriteCook API at ${apiBase}`);
    error(err.message || String(err));
    return null;
  }

  const { session_id, device_code, connect_url, expires_in } = session;

  // Step 2: Open the browser
  info(`Your verification code: ${device_code}`);
  console.log();

  try {
    await open(connect_url);
    info('Browser opened. Please log in and click "Authorize".');
  } catch {
    info(`Could not open browser automatically.`);
    info(`Please open this URL manually:`);
    console.log(`  ${connect_url}`);
  }

  // Step 3: Poll for completion
  const spin = spinner('Waiting for authorization...');
  spin.start();

  const pollInterval = 3000; // 3 seconds
  const deadline = Date.now() + expires_in * 1000;

  while (Date.now() < deadline) {
    await sleep(pollInterval);

    try {
      const res = await fetch(`${apiBase}/v1/api/device-auth/poll/${session_id}`);
      if (!res.ok) {
        continue; // Retry on transient errors
      }
      const data = await res.json();

      if (data.status === 'completed' && data.api_key) {
        spin.succeed('  Authorized!');
        return data.api_key;
      }

      if (data.status === 'expired') {
        spin.fail('  Session expired.');
        error('The authorization session expired. Please try again.');
        return null;
      }

      // status === 'pending' -- keep polling
    } catch {
      // Network hiccup, keep polling
    }
  }

  spin.fail('  Timed out waiting for authorization.');
  error('Authorization timed out. Please try again.');
  return null;
}

/**
 * Authenticate by having the user paste their API key manually.
 * Returns the raw API key string on success, or null on failure.
 */
export async function manualKeyEntry() {
  const response = await prompts({
    type: 'text',
    name: 'key',
    message: 'Paste your SpriteCook API key (sc_live_...):',
    validate: (val) => {
      if (!val || !val.startsWith('sc_live_')) {
        return 'API key must start with sc_live_';
      }
      if (val.length < 20) {
        return 'API key seems too short';
      }
      return true;
    },
  });

  if (!response.key) {
    return null; // User cancelled
  }

  return response.key;
}

/**
 * Prompt the user to choose an auth method and execute it.
 * Returns the API key or null.
 */
export async function authenticate() {
  const response = await prompts({
    type: 'select',
    name: 'method',
    message: 'How would you like to authenticate?',
    choices: [
      { title: 'Connect via browser (recommended)', value: 'browser' },
      { title: 'Enter API key manually', value: 'manual' },
    ],
    initial: 0,
  });

  if (!response.method) {
    return null; // User cancelled
  }

  if (response.method === 'browser') {
    const key = await deviceFlow();
    if (!key) {
      info('Browser auth failed. You can try entering your key manually.');
      const fallback = await prompts({
        type: 'confirm',
        name: 'retry',
        message: 'Try manual key entry instead?',
        initial: true,
      });
      if (fallback.retry) {
        return manualKeyEntry();
      }
      return null;
    }
    return key;
  }

  return manualKeyEntry();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
