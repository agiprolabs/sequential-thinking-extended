import { describe, it, expect, beforeEach } from 'vitest';
import { ContextStore } from '../src/context-layer/context-store.js';
import type { Storage } from '../src/context-layer/storage/storage.js';
import type { Session, ThoughtRecord, TaskCommit, DocumentationEntry } from '../src/context-layer/types.js';

// Mock storage implementation matching actual Storage interface
class MockStorage implements Storage {
  private sessions: Map<string, Session> = new Map();
  private thoughts: Map<string, ThoughtRecord[]> = new Map();
  private tasks: Map<string, TaskCommit[]> = new Map();
  private docs: Map<string, DocumentationEntry> = new Map();

  async createSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
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
}

describe('ContextStore', () => {
  let store: ContextStore;
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    store = new ContextStore(mockStorage);
  });

  describe('createSession', () => {
    it('should create a new session and return session ID', async () => {
      const sessionId = await store.createSession();

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_/);
    });

    it('should create sessions with unique IDs', async () => {
      const sessionId1 = await store.createSession();
      const sessionId2 = await store.createSession();

      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should store session with metadata', async () => {
      const sessionId = await store.createSession({ topic: 'testing' });

      const session = await mockStorage.getSession(sessionId);
      expect(session).not.toBeNull();
      expect(session?.metadata).toEqual({ topic: 'testing' });
    });
  });

  describe('saveThought', () => {
    it('should persist a thought to storage', async () => {
      const sessionId = await store.createSession();

      const thought: ThoughtRecord = {
        sessionId,
        thought: 'Test thought content',
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        timestamp: new Date(),
      };

      await store.saveThought(thought);

      const thoughts = await mockStorage.getThoughts(sessionId);
      expect(thoughts).toHaveLength(1);
      expect(thoughts[0].thought).toBe('Test thought content');
    });

    it('should increment session thought count', async () => {
      const sessionId = await store.createSession();

      await store.saveThought({
        sessionId,
        thought: 'First thought',
        thoughtNumber: 1,
        totalThoughts: 2,
        nextThoughtNeeded: true,
        timestamp: new Date(),
      });

      const session = await mockStorage.getSession(sessionId);
      expect(session?.thoughtCount).toBe(1);
    });
  });

  describe('sessionExists', () => {
    it('should return true for existing session', async () => {
      const sessionId = await store.createSession();
      const exists = await store.sessionExists(sessionId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      const exists = await store.sessionExists('non-existent-id');
      expect(exists).toBe(false);
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', async () => {
      await store.createSession();
      await store.createSession();
      await store.createSession();

      const sessions = await store.listSessions();
      expect(sessions).toHaveLength(3);
    });

    it('should return session summary info', async () => {
      const sessionId = await store.createSession();

      const sessions = await store.listSessions();
      const session = sessions.find(s => s.id === sessionId);

      expect(session).toBeDefined();
      expect(session?.thoughtCount).toBe(0);
      expect(session?.status).toBe('active');
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed', async () => {
      const sessionId = await store.createSession();
      await store.completeSession(sessionId);

      const session = await mockStorage.getSession(sessionId);
      expect(session?.status).toBe('completed');
    });
  });
});

