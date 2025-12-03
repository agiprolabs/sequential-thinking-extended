#!/usr/bin/env node

/**
 * Sequential Thinking Extended - MCP Server
 * Layer 1: Core sequential thinking
 * Layer 2: Context persistence and task management
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SequentialThinkingServer } from './sequential-thinking/lib.js';
import { ContextLayer } from './context-layer/index.js';
import type { ExtendedThoughtInput, ThoughtRecord } from './context-layer/types.js';

const server = new McpServer({
  name: "sequential-thinking-extended",
  version: "0.1.0",
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

// Run the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sequential Thinking Extended MCP Server running on stdio");
  console.error(`Data path: ${process.env.DATA_PATH || './data'}`);
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});

