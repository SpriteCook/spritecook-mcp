/**
 * Shared configuration for the SpriteCook CLI.
 */

/** Get the API base URL (env override for local dev/testing) */
export function getApiBase() {
  return process.env.SPRITECOOK_API_URL || 'https://api.spritecook.ai';
}

/** Get the MCP server URL */
export function getMcpUrl() {
  return `${getApiBase()}/mcp/`;
}

/** Get the OAuth-enabled MCP URL used by hosts that manage OAuth themselves. */
export function getMcpOAuthUrl() {
  return `${getApiBase()}/mcp/oauth`;
}
