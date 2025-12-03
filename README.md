# Sequential Thinking Extended

An extended MCP (Model Context Protocol) server that builds on the official Sequential Thinking server with added context persistence and task management.

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

## Installation

```bash
# Install dependencies
npm install

# Build
npm run build
```

## Usage

### Run Locally

```bash
npm start
```

### Run with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## MCP Configuration

### Claude Desktop

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "node",
      "args": ["path/to/dist/index.js"],
      "env": {
        "DATA_PATH": "/path/to/data"
      }
    }
  }
}
```

### With Docker

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-v", "thinking-data:/data", "sequential-thinking-extended"]
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
                  │ STDIO
                  ▼
┌─────────────────────────────────────────┐
│   Sequential Thinking Extended Server   │
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
```

## Environment Variables

- `DATA_PATH`: Path for persistent storage (default: `./data`)
- `DISABLE_THOUGHT_LOGGING`: Set to `true` to disable console output

## Development

```bash
# Watch mode
npm run dev

# Run tests
npm test
```

## License

MIT

