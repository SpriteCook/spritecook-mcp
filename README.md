# spritecook-mcp

Connect your AI agent (Cursor, VS Code, Claude, Codex, Grok Build, Antigravity, and others) to [SpriteCook](https://spritecook.ai) for AI-powered pixel art and game asset generation.

## Quick Setup

```bash
npx spritecook-mcp setup
```

This will:

1. **Detect** your installed AI clients, including Grok Build and Antigravity
2. **Authenticate** with an API key where required; Grok Build and Antigravity use host-managed OAuth
3. **Configure** MCP connections automatically
4. **Install** an optional agent skill for smarter AI integration

The optional skills include current guidance for asynchronous job polling, canonical `sprite_url` output, model discovery, GPT-Image-2 quality settings, guided character workflows, saved presets, multi-image style guide references, local-file uploads, background cleanup, asset organization and recovery, and Godot-ready character exports.

## What You Get

After setup, your AI agent can generate pixel art and game assets directly:

> "Generate a 64x64 pixel art sword sprite"

> "Create a character sprite sheet for my platformer game"

> "Make a set of potion icons with transparent backgrounds"

> "Use my character preset for a new idle sprite"

> "Import this local boss PNG, then animate it with a slow idle motion"

> "Remove the background from this character asset and give me the transparent PNG"

> "Rename the generated sword asset to Iron Sword Pickup"

## Manual Configuration

If you prefer to configure manually, add this to your editor's MCP config:

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "spritecook": {
      "url": "https://api.spritecook.ai/mcp/",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

**VS Code** (`.vscode/settings.json`):

```json
{
  "mcp": {
    "servers": {
      "spritecook": {
        "type": "http",
        "url": "https://api.spritecook.ai/mcp/",
        "headers": { "Authorization": "Bearer YOUR_API_KEY" }
      }
    }
  }
}
```

**Grok Build** (`.grok/config.toml` or `~/.grok/config.toml`):

```toml
[mcp_servers.spritecook]
url = "https://api.spritecook.ai/mcp/oauth"
enabled = true
tool_timeout_sec = 6000
```

Open `/mcps` in Grok Build and authenticate `spritecook`. Grok stores and refreshes OAuth credentials without exposing them to the model. If tools do not appear, run `grok mcp doctor spritecook` and `grok inspect`.

The repository also includes a root `.mcp.json` for a Grok Build marketplace submission. Publishing the marketplace listing is a separate release step.

**Antigravity**: setup installs the [SpriteCook plugin for Antigravity](https://github.com/SpriteCook/antigravity-plugin), which bundles the MCP server and the skills. To install it yourself:

```bash
agy plugin install https://github.com/SpriteCook/antigravity-plugin
```

Then sign in once. In the app or editor, open **Customizations > Installed** and click **Authenticate** next to `spritecook`. In the CLI, type `/plugin`, open **Installed > spritecook** and choose **Sign in**. Antigravity stores and refreshes the sign-in, so there is no API key to paste. Setup also removes an older `spritecook` entry with an API key from `~/.gemini/config/mcp_config.json`, so the tools don't load twice.

## Environment Variables

- `SPRITECOOK_API_URL` - Override the API base URL (for local development)

## Links

- [SpriteCook](https://spritecook.ai) - AI game asset generator
- [API Documentation](https://spritecook.ai/docs) - Full API reference
- [Get API Key](https://app.spritecook.ai) - Sign up and manage API keys
