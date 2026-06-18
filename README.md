# spritecook-mcp

Connect your AI agent (Cursor, VS Code, Claude Desktop, Claude Code) to [SpriteCook](https://spritecook.ai) for AI-powered pixel art and game asset generation.

## Quick Setup

```bash
npx spritecook-mcp setup
```

This will:

1. **Authenticate** your SpriteCook account (browser-based or manual API key)
2. **Detect** your editors (Cursor, VS Code, Claude Desktop, Claude Code)
3. **Configure** MCP connections automatically
4. **Install** an optional agent skill for smarter AI integration

The optional skills include current guidance for model discovery, GPT-Image-2 quality settings, guided character workflows, saved presets, multi-image style guide references, importing local image bytes with `import_asset(...)`, cleaning up backgrounds with `remove_background(...)`, renaming assets with `update_asset_label(...)`, recovering lost asset IDs with `list_recent_assets(...)`, using the primary asset URL instead of lower-level variant fields, and exporting SpriteCook character animations into Godot-ready scenes.

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

## Environment Variables

- `SPRITECOOK_API_URL` - Override the API base URL (for local development)

## Links

- [SpriteCook](https://spritecook.ai) - AI game asset generator
- [API Documentation](https://spritecook.ai/docs) - Full API reference
- [Get API Key](https://app.spritecook.ai) - Sign up and manage API keys
