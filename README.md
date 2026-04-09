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

## What You Get

After setup, your AI agent can generate pixel art and game assets directly:

> "Generate a 64x64 pixel art sword sprite"

> "Create a character sprite sheet for my platformer game"

> "Make a set of potion icons with transparent backgrounds"

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
