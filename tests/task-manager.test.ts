import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '../src/context-layer/task-manager.js';
import type { Storage } from '../src/context-layer/storage/storage.js';
import type { TaskCommit, Session, ThoughtRecord, DocumentationEntry } from '../src/context-layer/types.js';

// Mock storage matching actual Storage interface
class MockStorage implements Storage {
  private sessions: Map<string, Session> = new Map();
  private tasks: Map<string, TaskCommit[]> = new Map();

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

  async saveThought(): Promise<void> {}
  async getThoughts(): Promise<ThoughtRecord[]> { return []; }

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

  async saveDocumentation(): Promise<void> {}
  async getDocumentation(): Promise<DocumentationEntry | null> { return null; }
}

describe('TaskManager', () => {
  let manager: TaskManager;
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    manager = new TaskManager(mockStorage);
  });

  describe('createTask', () => {
    it('should create a new task with unique ID', async () => {
      const task = await manager.createTask({
        sessionId: 'session-1',
        taskTitle: 'Implement feature X',
        description: 'Add the new feature to the system',
      });

      expect(task.taskId).toBeDefined();
      expect(task.taskId).toMatch(/^task_/);
      expect(task.taskTitle).toBe('Implement feature X');
      expect(task.status).toBe('pending');
    });

    it('should set default status to pending', async () => {
      const task = await manager.createTask({
        sessionId: 'session-1',
        taskTitle: 'New Task',
      });

      expect(task.status).toBe('pending');
    });

    it('should include creation timestamp', async () => {
      const task = await manager.createTask({
        sessionId: 'session-1',
        taskTitle: 'New Task',
      });

      expect(task.createdAt).toBeDefined();
    });
  });

  describe('commitTask', () => {
    it('should commit a task with completed status', async () => {
      const committed = await manager.commitTask({
        sessionId: 'session-1',
        taskTitle: 'Completed Task',
        completedAtThought: 5,
      });

      expect(committed.status).toBe('completed');
      expect(committed.completedAt).toBeDefined();
      expect(committed.completedAtThought).toBe(5);
    });

    it('should generate task ID if not provided', async () => {
      const committed = await manager.commitTask({
        sessionId: 'session-1',
        taskTitle: 'Auto-ID Task',
        completedAtThought: 3,
      });

      expect(committed.taskId).toMatch(/^task_/);
    });
  });

  describe('getTasks', () => {
    it('should return all tasks for a session', async () => {
      await manager.createTask({ sessionId: 'session-1', taskTitle: 'Task 1' });
      await manager.createTask({ sessionId: 'session-1', taskTitle: 'Task 2' });
      await manager.createTask({ sessionId: 'session-2', taskTitle: 'Task 3' });

      const tasks = await manager.getTasks('session-1');

      expect(tasks).toHaveLength(2);
    });
  });

  describe('shouldCommitTask', () => {
    it('should return true when taskContext has commitTask=true', () => {
      expect(manager.shouldCommitTask({ commitTask: true })).toBe(true);
    });

    it('should return false when taskContext has commitTask=false', () => {
      expect(manager.shouldCommitTask({ commitTask: false })).toBe(false);
    });

    it('should return false when taskContext is undefined', () => {
      expect(manager.shouldCommitTask()).toBe(false);
      expect(manager.shouldCommitTask(undefined)).toBe(false);
    });
  });
});

