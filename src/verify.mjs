import { spinner, success, error } from './ui.mjs';
import { getApiBase } from './config.mjs';

/**
 * Verify an API key by calling the credits endpoint.
 * Returns { ok: boolean, credits?: number, tier?: string }
 */
export async function verifyApiKey(apiKey) {
  const spin = spinner('Verifying API key...');
  spin.start();

  try {
    const res = await fetch(`${getApiBase()}/v1/api/credits`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      spin.fail('  Verification failed');
      const body = await res.text();
      if (res.status === 401) {
        error('Invalid or expired API key.');
      } else {
        error(`API returned ${res.status}: ${body}`);
      }
      return { ok: false };
    }

    const data = await res.json();
    const credits = data.total ?? data.credits ?? data.credits_remaining ?? 0;
    const tier = data.tier || data.subscription_tier || 'free';

    spin.succeed(`  Verified! (${credits} credits, ${tier} tier)`);
    return { ok: true, credits, tier };
  } catch (err) {
    spin.fail('  Verification failed');
    error(`Could not reach SpriteCook API: ${err.message || err}`);
    return { ok: false };
  }
}
