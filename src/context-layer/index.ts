/**
 * Context Layer - Layer 2
 * Main entry point for context persistence and task management
 */

import { FileStorage } from './storage/file-storage.js';
import { TaskManager } from './task-manager.js';
import { DocumentationGenerator } from './documentation.js';
import { ContextStore } from './context-store.js';
import type { ThoughtRecord, TaskCommit, SessionContext, TaskContext } from './types.js';

export interface ContextLayerOptions {
  dataPath: string;
}

export class ContextLayer {
  private storage: FileStorage;
  private contextStore: ContextStore;
  private taskManager: TaskManager;
  private documentation: DocumentationGenerator;

  constructor(options: ContextLayerOptions) {
    this.storage = new FileStorage(options.dataPath);
    this.contextStore = new ContextStore(this.storage);
    this.taskManager = new TaskManager(this.storage);
    this.documentation = new DocumentationGenerator(this.storage);
  }

  async createSession(metadata?: Record<string, unknown>): Promise<string> {
    return this.contextStore.createSession(metadata);
  }

  async ensureSession(sessionId?: string): Promise<string> {
    if (sessionId) {
      const exists = await this.contextStore.sessionExists(sessionId);
      if (exists) {
        return sessionId;
      }
    }
    return this.createSession();
  }

  async persistThought(thought: ThoughtRecord): Promise<void> {
    return this.contextStore.saveThought(thought);
  }

  async commitTask(params: {
    sessionId: string;
    taskId?: string;
    taskTitle?: string;
    description?: string;
    completedAtThought: number;
  }): Promise<TaskCommit> {
    return this.taskManager.commitTask(params);
  }

  async generateDocumentation(sessionId: string): Promise<void> {
    await this.documentation.generate(sessionId);
  }

  async getContext(sessionId: string): Promise<SessionContext> {
    return this.contextStore.getContext(sessionId);
  }

  async listSessions(): Promise<Array<{
    id: string;
    createdAt: string;
    thoughtCount: number;
    taskCount: number;
    status: string;
  }>> {
    return this.contextStore.listSessions();
  }

  shouldCommitTask(taskContext?: TaskContext): boolean {
    return this.taskManager.shouldCommitTask(taskContext);
  }
}

// Re-export types
export * from './types.js';

