import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentationGenerator } from '../src/context-layer/documentation.js';
import type { Storage } from '../src/context-layer/storage/storage.js';
import type { Session, ThoughtRecord, TaskCommit, DocumentationEntry } from '../src/context-layer/types.js';

// Mock storage matching actual Storage interface
class MockStorage implements Storage {
  private sessions: Map<string, Session> = new Map();
  private thoughts: Map<string, ThoughtRecord[]> = new Map();
  private tasks: Map<string, TaskCommit[]> = new Map();
  private docs: Map<string, DocumentationEntry> = new Map();

  async createSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async getSession(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async updateSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async listSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async saveThought(thought: ThoughtRecord): Promise<void> {
    const existing = this.thoughts.get(thought.sessionId) || [];
    existing.push(thought);
    this.thoughts.set(thought.sessionId, existing);
  }

  async getThoughts(sessionId: string): Promise<ThoughtRecord[]> {
    return this.thoughts.get(sessionId) || [];
  }

  async saveTask(task: TaskCommit): Promise<void> {
    const existing = this.tasks.get(task.sessionId) || [];
    existing.push(task);
    this.tasks.set(task.sessionId, existing);
  }

  async getTask(sessionId: string, taskId: string): Promise<TaskCommit | null> {
    const tasks = this.tasks.get(sessionId) || [];
    return tasks.find(t => t.taskId === taskId) || null;
  }

  async getTasks(sessionId: string): Promise<TaskCommit[]> {
    return this.tasks.get(sessionId) || [];
  }

  async updateTask(task: TaskCommit): Promise<void> {
    const tasks = this.tasks.get(task.sessionId) || [];
    const index = tasks.findIndex(t => t.taskId === task.taskId);
    if (index >= 0) {
      tasks[index] = task;
    }
  }

  async saveDocumentation(doc: DocumentationEntry): Promise<void> {
    this.docs.set(doc.sessionId, doc);
  }

  async getDocumentation(sessionId: string): Promise<DocumentationEntry | null> {
    return this.docs.get(sessionId) || null;
  }

  // Helper for tests
  setSession(session: Session): void {
    this.sessions.set(session.id, session);
  }

  setThoughts(sessionId: string, thoughts: ThoughtRecord[]): void {
    this.thoughts.set(sessionId, thoughts);
  }

  setTasks(sessionId: string, tasks: TaskCommit[]): void {
    this.tasks.set(sessionId, tasks);
  }
}

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator;
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    generator = new DocumentationGenerator(mockStorage);

    // Set up a default session
    mockStorage.setSession({
      id: 'test-session',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      status: 'active',
      thoughtCount: 0,
      taskCount: 0,
    });
  });

  describe('generate', () => {
    it('should generate documentation from session thoughts', async () => {
      mockStorage.setThoughts('test-session', [
        {
          sessionId: 'test-session',
          thought: 'First, I need to understand the problem',
          thoughtNumber: 1,
          totalThoughts: 3,
          nextThoughtNeeded: true,
          timestamp: new Date(),
        },
        {
          sessionId: 'test-session',
          thought: 'The solution involves implementing X',
          thoughtNumber: 2,
          totalThoughts: 3,
          nextThoughtNeeded: true,
          timestamp: new Date(),
        },
        {
          sessionId: 'test-session',
          thought: 'Final solution: Use approach Y',
          thoughtNumber: 3,
          totalThoughts: 3,
          nextThoughtNeeded: false,
          timestamp: new Date(),
        },
      ]);

      const doc = await generator.generate('test-session');

      expect(doc.sessionId).toBe('test-session');
      expect(doc.content).toContain('First, I need to understand the problem');
      expect(doc.content).toContain('Final solution');
      expect(doc.thoughtCount).toBe(3);
    });

    it('should include thought numbers in documentation', async () => {
      mockStorage.setThoughts('test-session', [
        {
          sessionId: 'test-session',
          thought: 'Single thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          timestamp: new Date(),
        },
      ]);

      const doc = await generator.generate('test-session');

      expect(doc.content).toContain('Thought 1');
    });

    it('should mark revisions in documentation', async () => {
      mockStorage.setThoughts('test-session', [
        {
          sessionId: 'test-session',
          thought: 'Original thought',
          thoughtNumber: 1,
          totalThoughts: 2,
          nextThoughtNeeded: true,
          timestamp: new Date(),
        },
        {
          sessionId: 'test-session',
          thought: 'Revised understanding',
          thoughtNumber: 2,
          totalThoughts: 2,
          nextThoughtNeeded: false,
          isRevision: true,
          revisesThought: 1,
          timestamp: new Date(),
        },
      ]);

      const doc = await generator.generate('test-session');

      expect(doc.content).toContain('Revision');
    });

    it('should throw error for non-existent session', async () => {
      await expect(generator.generate('non-existent'))
        .rejects.toThrow('Session not found');
    });

    it('should include tasks in documentation', async () => {
      mockStorage.setThoughts('test-session', [
        {
          sessionId: 'test-session',
          thought: 'Working on task',
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          timestamp: new Date(),
        },
      ]);

      mockStorage.setTasks('test-session', [
        {
          sessionId: 'test-session',
          taskId: 'task-1',
          taskTitle: 'Complete feature',
          status: 'completed',
          completedAtThought: 1,
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ]);

      const doc = await generator.generate('test-session');

      expect(doc.content).toContain('Complete feature');
      expect(doc.taskCount).toBe(1);
    });

    it('should generate summary with counts', async () => {
      mockStorage.setThoughts('test-session', [
        {
          sessionId: 'test-session',
          thought: 'Thought 1',
          thoughtNumber: 1,
          totalThoughts: 2,
          nextThoughtNeeded: true,
          timestamp: new Date(),
        },
        {
          sessionId: 'test-session',
          thought: 'Thought 2',
          thoughtNumber: 2,
          totalThoughts: 2,
          nextThoughtNeeded: false,
          timestamp: new Date(),
        },
      ]);

      mockStorage.setTasks('test-session', [
        {
          sessionId: 'test-session',
          taskId: 'task-1',
          taskTitle: 'Task 1',
          status: 'completed',
          completedAtThought: 2,
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ]);

      const doc = await generator.generate('test-session');

      expect(doc.summary).toContain('2 thoughts');
      expect(doc.summary).toContain('1 tasks completed');
    });
  });

  describe('getDocumentation', () => {
    it('should retrieve saved documentation', async () => {
      mockStorage.setThoughts('test-session', [
        {
          sessionId: 'test-session',
          thought: 'Test thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          timestamp: new Date(),
        },
      ]);

      await generator.generate('test-session');
      const doc = await generator.getDocumentation('test-session');

      expect(doc).not.toBeNull();
      expect(doc?.sessionId).toBe('test-session');
    });

    it('should return null for non-existent documentation', async () => {
      const doc = await generator.getDocumentation('non-existent');
      expect(doc).toBeNull();
    });
  });
});

