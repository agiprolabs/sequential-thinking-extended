#!/usr/bin/env node
/**
 * End-to-End Test for Sequential Thinking Extended MCP Server
 * Tests the server via STDIO transport by sending MCP protocol messages
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '..', 'dist', 'index.js');

// Start the MCP server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, DATA_PATH: './data', DISABLE_THOUGHT_LOGGING: 'true' }
});

let responseBuffer = '';
let messageId = 1;

// Handle server stderr (logging)
server.stderr.on('data', (data) => {
  console.log('[SERVER LOG]', data.toString().trim());
});

// Handle server stdout (MCP responses)
server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  processResponses();
});

function processResponses() {
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('\n✅ Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('[RAW]', line);
      }
    }
  }
}

function sendMessage(message) {
  const json = JSON.stringify(message);
  console.log('\n📤 Sending:', json);
  server.stdin.write(json + '\n');
}

async function runTests() {
  console.log('🚀 Starting E2E Test for Sequential Thinking Extended MCP Server\n');
  
  // Wait for server to initialize
  await new Promise(r => setTimeout(r, 1000));

  // Test 1: Initialize
  console.log('\n--- Test 1: Initialize ---');
  sendMessage({
    jsonrpc: '2.0',
    id: messageId++,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'e2e-test', version: '1.0.0' }
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // Test 2: List Tools
  console.log('\n--- Test 2: List Tools ---');
  sendMessage({
    jsonrpc: '2.0',
    id: messageId++,
    method: 'tools/list',
    params: {}
  });
  await new Promise(r => setTimeout(r, 500));

  // Test 3: Call sequentialthinking tool - First thought
  console.log('\n--- Test 3: First Thought ---');
  sendMessage({
    jsonrpc: '2.0',
    id: messageId++,
    method: 'tools/call',
    params: {
      name: 'sequentialthinking',
      arguments: {
        thought: 'Let me analyze the problem: How to test an MCP server end-to-end?',
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true
      }
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // Test 4: Call sequentialthinking tool - Second thought
  console.log('\n--- Test 4: Second Thought ---');
  sendMessage({
    jsonrpc: '2.0',
    id: messageId++,
    method: 'tools/call',
    params: {
      name: 'sequentialthinking',
      arguments: {
        thought: 'I should send JSON-RPC messages and verify responses',
        thoughtNumber: 2,
        totalThoughts: 3,
        nextThoughtNeeded: true
      }
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // Test 5: Final thought with task commit
  console.log('\n--- Test 5: Final Thought with Task Commit ---');
  sendMessage({
    jsonrpc: '2.0',
    id: messageId++,
    method: 'tools/call',
    params: {
      name: 'sequentialthinking',
      arguments: {
        thought: 'The E2E test is working correctly!',
        thoughtNumber: 3,
        totalThoughts: 3,
        nextThoughtNeeded: false,
        taskContext: {
          taskTitle: 'E2E Test Verification',
          description: 'Verified MCP server responds correctly',
          commitTask: true
        }
      }
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // Test 6: List sessions
  console.log('\n--- Test 6: List Sessions ---');
  sendMessage({
    jsonrpc: '2.0',
    id: messageId++,
    method: 'tools/call',
    params: {
      name: 'list_thinking_sessions',
      arguments: {}
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // Clean shutdown
  console.log('\n--- Tests Complete ---');
  server.stdin.end();
  await new Promise(r => setTimeout(r, 500));
  server.kill();
  
  console.log('\n✨ E2E Test completed successfully!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  server.kill();
  process.exit(1);
});

