#!/usr/bin/env node

/**
 * DevPattern - MCP Server
 * Layer 1: Core sequential thinking
 * Layer 2: Context persistence and task management
 *
 * Supports both STDIO and HTTP transports
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { randomUUID } from 'node:crypto';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { SequentialThinkingServer } from './sequential-thinking/lib.js';
import { ContextLayer } from './context-layer/index.js';
import type { ExtendedThoughtInput, ThoughtRecord } from './context-layer/types.js';

const server = new McpServer({
  name: "devpattern",
  version: "0.2.0",
});

const thinkingServer = new SequentialThinkingServer();
const contextLayer = new ContextLayer({
  dataPath: process.env.DATA_PATH || './data'
});

// Tool description for sequential thinking
const TOOL_DESCRIPTION = `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

EXTENDED FEATURES:
- Automatic context persistence across sessions
- Task tracking and commits
- Auto-generated documentation on completion

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Tasks that need to maintain context over multiple steps

Key features:
- Adjust total_thoughts up or down as you progress
- Question or revise previous thoughts
- Add more thoughts even after reaching what seemed like the end
- Branch into alternative reasoning paths
- Automatically persist context for future reference
- Commit tasks as they are completed`;

// Register the extended sequential thinking tool
server.tool(
  "sequentialthinking",
  TOOL_DESCRIPTION,
  {
    thought: z.string().describe("Your current thinking step"),
    nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
    thoughtNumber: z.number().int().min(1).describe("Current thought number"),
    totalThoughts: z.number().int().min(1).describe("Estimated total thoughts needed"),
    isRevision: z.boolean().optional().describe("Whether this revises previous thinking"),
    revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered"),
    branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number"),
    branchId: z.string().optional().describe("Branch identifier"),
    needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed"),
    // Layer 2 extensions
    sessionId: z.string().optional().describe("Session ID for context persistence"),
    taskContext: z.object({
      taskId: z.string().optional(),
      taskTitle: z.string().optional(),
      description: z.string().optional(),
      commitTask: z.boolean().optional(),
    }).optional().describe("Task tracking context"),
  },
  async (args: ExtendedThoughtInput) => {
    // Layer 1: Core sequential thinking
    const result = thinkingServer.processThought({
      thought: args.thought,
      thoughtNumber: args.thoughtNumber,
      totalThoughts: args.totalThoughts,
      nextThoughtNeeded: args.nextThoughtNeeded,
      isRevision: args.isRevision,
      revisesThought: args.revisesThought,
      branchFromThought: args.branchFromThought,
      branchId: args.branchId,
      needsMoreThoughts: args.needsMoreThoughts,
    });

    if (result.isError) {
      return { content: result.content, isError: true };
    }

    // Layer 2: Ensure session exists
    const sessionId = await contextLayer.ensureSession(args.sessionId);

    // Layer 2: Persist thought
    const thoughtRecord: ThoughtRecord = {
      sessionId,
      thought: args.thought,
      thoughtNumber: args.thoughtNumber,
      totalThoughts: args.totalThoughts,
      branchId: args.branchId,
      isRevision: args.isRevision,
      revisesThought: args.revisesThought,
      timestamp: new Date(),
    };
    await contextLayer.persistThought(thoughtRecord);

    // Layer 2: Task management
    if (contextLayer.shouldCommitTask(args.taskContext)) {
      await contextLayer.commitTask({
        sessionId,
        taskId: args.taskContext?.taskId,
        taskTitle: args.taskContext?.taskTitle,
        description: args.taskContext?.description,
        completedAtThought: args.thoughtNumber,
      });
    }

    // Layer 2: Auto-documentation on completion
    if (!args.nextThoughtNeeded) {
      await contextLayer.generateDocumentation(sessionId);
    }

    const parsedContent = JSON.parse(result.content[0].text);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          ...parsedContent,
          sessionId,
          persistedContext: true,
        }, null, 2)
      }]
    };
  }
);

// Additional Layer 2 tools

// Get thinking context tool
server.tool(
  "get_thinking_context",
  "Retrieve persisted thinking context for a session including all thoughts and tasks",
  {
    sessionId: z.string().describe("Session ID to retrieve"),
  },
  async (args: { sessionId: string }) => {
    try {
      const context = await contextLayer.getContext(args.sessionId);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(context, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: String(error) }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// List sessions tool
server.tool(
  "list_thinking_sessions",
  "List all thinking sessions with their status and statistics",
  {},
  async () => {
    const sessions = await contextLayer.listSessions();
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ sessions }, null, 2)
      }]
    };
  }
);

// Parse JSON body from raw request
async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : undefined);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Check if request body contains an initialize request
function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some(msg => msg?.method === 'initialize');
  }
  return (body as Record<string, unknown>)?.method === 'initialize';
}

// Factory function to create a new MCP server instance for each HTTP session
function createMcpServerInstance() {
  const mcpServer = new McpServer({
    name: "devpattern",
    version: "0.2.0",
  });

  // Each session gets its own thinking server (stateful per-request)
  // Context layer is shared (persists to disk)
  const thinkingServerInstance = new SequentialThinkingServer();
  const contextLayerInstance = new ContextLayer({
    dataPath: process.env.DATA_PATH || './data'
  });

  // Register the sequentialthinking tool
  mcpServer.tool(
    "sequentialthinking",
    TOOL_DESCRIPTION,
    {
      thought: z.string().describe("Your current thinking step"),
      nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
      thoughtNumber: z.number().int().min(1).describe("Current thought number"),
      totalThoughts: z.number().int().min(1).describe("Estimated total thoughts needed"),
      isRevision: z.boolean().optional().describe("Whether this revises previous thinking"),
      revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered"),
      branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number"),
      branchId: z.string().optional().describe("Branch identifier"),
      needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed"),
      sessionId: z.string().optional().describe("Session ID for context persistence"),
      taskContext: z.object({
        taskId: z.string().optional(),
        taskTitle: z.string().optional(),
        description: z.string().optional(),
        commitTask: z.boolean().optional(),
      }).optional().describe("Task tracking context"),
    },
    async (args: ExtendedThoughtInput) => {
      // Layer 1: Core sequential thinking
      const result = thinkingServerInstance.processThought({
        thought: args.thought,
        thoughtNumber: args.thoughtNumber,
        totalThoughts: args.totalThoughts,
        nextThoughtNeeded: args.nextThoughtNeeded,
        isRevision: args.isRevision,
        revisesThought: args.revisesThought,
        branchFromThought: args.branchFromThought,
        branchId: args.branchId,
        needsMoreThoughts: args.needsMoreThoughts,
      });

      if (result.isError) {
        return { content: result.content, isError: true };
      }

      // Layer 2: Ensure session exists
      const sessionId = await contextLayerInstance.ensureSession(args.sessionId);

      // Layer 2: Persist thought
      const thoughtRecord: ThoughtRecord = {
        sessionId,
        thought: args.thought,
        thoughtNumber: args.thoughtNumber,
        totalThoughts: args.totalThoughts,
        branchId: args.branchId,
        isRevision: args.isRevision,
        revisesThought: args.revisesThought,
        timestamp: new Date(),
      };
      await contextLayerInstance.persistThought(thoughtRecord);

      // Layer 2: Task management
      if (contextLayerInstance.shouldCommitTask(args.taskContext)) {
        await contextLayerInstance.commitTask({
          sessionId,
          taskId: args.taskContext?.taskId,
          taskTitle: args.taskContext?.taskTitle,
          description: args.taskContext?.description,
          completedAtThought: args.thoughtNumber,
        });
      }

      // Layer 2: Auto-documentation on completion
      if (!args.nextThoughtNeeded) {
        await contextLayerInstance.generateDocumentation(sessionId);
      }

      const parsedContent = JSON.parse(result.content[0].text);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            ...parsedContent,
            sessionId,
            persistedContext: true,
          }, null, 2)
        }]
      };
    }
  );

  // Register get_thinking_context tool
  mcpServer.tool(
    "get_thinking_context",
    "Retrieve persisted thinking context for a session including all thoughts and tasks",
    {
      sessionId: z.string().describe("Session ID to retrieve"),
    },
    async (args: { sessionId: string }) => {
      try {
        const context = await contextLayerInstance.getContext(args.sessionId);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(context, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: String(error) })
          }],
          isError: true
        };
      }
    }
  );

  // Register list_thinking_sessions tool
  mcpServer.tool(
    "list_thinking_sessions",
    "List all available thinking sessions with their status",
    {},
    async () => {
      const sessions = await contextLayerInstance.listSessions();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ sessions }, null, 2)
        }]
      };
    }
  );

  return mcpServer;
}

// HTTP Transport handler
async function runHttpServer() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  // Track active sessions: sessionId -> { server, transport }
  const sessions: Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }> = new Map();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Health check endpoint
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        transport: 'http',
        version: '0.2.0',
        activeSessions: sessions.size
      }));
      return;
    }

    // MCP endpoint
    if (url.pathname === '/mcp') {
      try {
        // Check for existing session
        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        if (sessionId && sessions.has(sessionId)) {
          // Reuse existing session's transport
          const session = sessions.get(sessionId)!;
          await session.transport.handleRequest(req, res);
          return;
        }

        if (req.method === 'POST') {
          // Parse request body to check if it's an initialization request
          const body = await parseJsonBody(req);

          if (!sessionId && isInitializeRequest(body)) {
            // New initialization request - create new server + transport pair
            const mcpServer = createMcpServerInstance();
            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (newSessionId) => {
                sessions.set(newSessionId, { server: mcpServer, transport });
                console.error(`[HTTP] New session initialized: ${newSessionId}`);
              },
            });

            // Set up cleanup on close
            transport.onclose = () => {
              const sid = transport.sessionId;
              if (sid && sessions.has(sid)) {
                sessions.delete(sid);
                console.error(`[HTTP] Session closed: ${sid}`);
              }
            };

            // Connect the transport to the MCP server before handling request
            await mcpServer.connect(transport);

            // Handle the request with parsed body
            await transport.handleRequest(req, res, body);
            return;
          }

          // Non-initialization POST without valid session
          if (!sessionId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32600, message: 'Bad Request: Session ID required for non-initialization requests' },
              id: null
            }));
            return;
          }
        }

        // Session not found (for GET, DELETE, or POST with unknown session)
        if (sessionId && !sessions.has(sessionId)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Session not found' },
            id: null
          }));
          return;
        }

        // GET or DELETE without session
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Bad Request: Session ID required' },
          id: null
        }));
      } catch (error) {
        console.error('[HTTP] Error handling request:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null
          }));
        }
      }
      return;
    }

    // 404 for unknown paths
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(port, host, () => {
    console.error(`DevPattern MCP Server running on HTTP`);
    console.error(`  Endpoint: http://${host}:${port}/mcp`);
    console.error(`  Health:   http://${host}:${port}/health`);
    console.error(`  Data path: ${process.env.DATA_PATH || './data'}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.error('[HTTP] Shutting down...');

    // Close all active sessions
    for (const [sessionId, session] of sessions) {
      try {
        await session.transport.close();
        console.error(`[HTTP] Closed session: ${sessionId}`);
      } catch (e) {
        console.error(`[HTTP] Error closing session ${sessionId}:`, e);
      }
    }
    sessions.clear();

    httpServer.close(() => {
      console.error('[HTTP] Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// STDIO Transport handler
async function runStdioServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DevPattern MCP Server running on STDIO");
  console.error(`Data path: ${process.env.DATA_PATH || './data'}`);
}

// Run the server with selected transport
async function runServer() {
  const transportMode = process.env.TRANSPORT_MODE || 'stdio';

  console.error(`DevPattern MCP Server v0.2.0`);
  console.error(`Transport mode: ${transportMode}`);

  if (transportMode === 'http') {
    await runHttpServer();
  } else {
    await runStdioServer();
  }
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
