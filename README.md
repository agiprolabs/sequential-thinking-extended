# DevPattern

An MCP (Model Context Protocol) server for structured problem-solving with context persistence, task management, and multi-tenant HTTP support.

## Features

### Layer 1: Core Sequential Thinking
- Break down complex problems into manageable steps
- Revise and refine thoughts as understanding deepens
- Branch into alternative paths of reasoning
- Adjust the total number of thoughts dynamically

### Layer 2: Context & Task Management
- **Context Persistence**: Automatically save thinking sessions for future reference
- **Task Tracking**: Commit and track tasks as they are completed
- **Auto-Documentation**: Generate documentation when thinking sessions complete
- **Session Management**: List and retrieve historical sessions

### Transport Modes
- **STDIO**: For local MCP client integration (Claude Desktop, Cline, etc.)
- **HTTP**: For cloud/multi-tenant deployment with session management

## Installation

```bash
# Install dependencies
npm install

# Build
npm run build
```

## Usage

### Run Locally (STDIO)

```bash
npm start
```

### Run with HTTP Transport

```bash
# Environment variable
TRANSPORT_MODE=http PORT=3000 npm start

# Or using the npm script
npm run start:http
```

### Run with Docker

```bash
# HTTP mode (default) - for cloud deployment
docker-compose up -d

# STDIO mode - for local MCP clients
docker-compose --profile stdio up devpattern-stdio

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## MCP Configuration

### Claude Desktop (STDIO)

```json
{
  "mcpServers": {
    "devpattern": {
      "command": "node",
      "args": ["path/to/dist/index.js"],
      "env": {
        "DATA_PATH": "/path/to/data",
        "TRANSPORT_MODE": "stdio"
      }
    }
  }
}
```

### Docker STDIO

```json
{
  "mcpServers": {
    "devpattern": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "TRANSPORT_MODE=stdio",
        "-v", "/path/to/data:/data",
        "ghcr.io/agiprolabs/devpattern:latest"
      ]
    }
  }
}
```

### HTTP Transport (for cloud/remote servers)

```json
{
  "mcpServers": {
    "devpattern": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Tools

### `sequentialthinking`
The main thinking tool with extended features:

**Inputs:**
- `thought`: Current thinking step
- `nextThoughtNeeded`: Whether another thought step is needed
- `thoughtNumber`: Current thought number
- `totalThoughts`: Estimated total thoughts needed
- `isRevision`: Whether this revises previous thinking
- `branchId`: Branch identifier for alternative paths
- `sessionId`: (Optional) Session ID for persistence
- `taskContext`: (Optional) Task tracking context

### `get_thinking_context`
Retrieve persisted context for a session.

### `list_thinking_sessions`
List all thinking sessions with status.

## Architecture

```
┌─────────────────────────────────────────┐
│           MCP Client (AI)               │
└─────────────────┬───────────────────────┘
                  │ STDIO or HTTP
                  ▼
┌─────────────────────────────────────────┐
│        DevPattern MCP Server            │
│  ┌───────────────────────────────────┐  │
│  │ Layer 1: Sequential Thinking Core │  │
│  └───────────────┬───────────────────┘  │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │ Layer 2: Context & Task Manager   │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼──────────────────────┘
                   ▼
            Volume: /data
                   ▲
                   │ (For cloud deployment)
┌──────────────────┴──────────────────────┐
│         Cloudflare Tunnel               │
│  tenant-xxx.devpattern.agi.pro → :3000  │
└─────────────────────────────────────────┘
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TRANSPORT_MODE` | `stdio` or `http` | `stdio` |
| `PORT` | HTTP port (when `http` mode) | `3000` |
| `HOST` | Bind address | `0.0.0.0` |
| `DATA_PATH` | Path for persistent storage | `./data` |
| `DISABLE_THOUGHT_LOGGING` | Disable console output | `false` |

## HTTP Endpoints

When running in HTTP mode:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST | MCP JSON-RPC requests |
| `/mcp` | GET | SSE stream for notifications |
| `/mcp` | DELETE | Close session |
| `/health` | GET | Health check |

## Development

```bash
# Watch mode
npm run dev

# Run tests
npm test
```

## License

MIT
