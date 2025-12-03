/**
 * Context Store
 * Manages session and thought persistence
 */

import { randomUUID } from 'crypto';
import type { Storage } from './storage/storage.js';
import type { Session, ThoughtRecord, SessionContext } from './types.js';

export class ContextStore {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async createSession(metadata?: Record<string, unknown>): Promise<string> {
    const sessionId = `session_${randomUUID().slice(0, 12)}`;
    const now = new Date();

    const session: Session = {
      id: sessionId,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      thoughtCount: 0,
      taskCount: 0,
      metadata,
    };

    await this.storage.createSession(session);
    return sessionId;
  }

  async saveThought(thought: ThoughtRecord): Promise<void> {
    await this.storage.saveThought(thought);

    // Update session
    const session = await this.storage.getSession(thought.sessionId);
    if (session) {
      session.thoughtCount++;
      session.updatedAt = new Date();
      await this.storage.updateSession(session);
    }
  }

  async getContext(sessionId: string): Promise<SessionContext> {
    const session = await this.storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const thoughts = await this.storage.getThoughts(sessionId);
    const tasks = await this.storage.getTasks(sessionId);

    return {
      session,
      thoughts,
      tasks,
    };
  }

  async listSessions(): Promise<Array<{
    id: string;
    createdAt: string;
    thoughtCount: number;
    taskCount: number;
    status: string;
  }>> {
    const sessions = await this.storage.listSessions();
    return sessions.map(s => ({
      id: s.id,
      createdAt: s.createdAt.toString(),
      thoughtCount: s.thoughtCount,
      taskCount: s.taskCount,
      status: s.status,
    }));
  }

  async completeSession(sessionId: string): Promise<void> {
    const session = await this.storage.getSession(sessionId);
    if (session) {
      session.status = 'completed';
      session.updatedAt = new Date();
      await this.storage.updateSession(session);
    }
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const session = await this.storage.getSession(sessionId);
    return session !== null;
  }
}

