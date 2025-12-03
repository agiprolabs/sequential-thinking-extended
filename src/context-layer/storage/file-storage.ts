/**
 * File-based Storage Implementation
 * Persists data as JSON files
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { Storage } from './storage.js';
import type { Session, ThoughtRecord, TaskCommit, DocumentationEntry } from '../types.js';

export class FileStorage implements Storage {
  private dataPath: string;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private getSessionDir(sessionId: string): string {
    return join(this.dataPath, 'sessions', sessionId);
  }

  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  private async writeJson<T>(filePath: string, data: T): Promise<void> {
    const dir = join(filePath, '..');
    await this.ensureDir(dir);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // Session operations
  async createSession(session: Session): Promise<void> {
    const sessionDir = this.getSessionDir(session.id);
    await this.ensureDir(sessionDir);
    await this.writeJson(join(sessionDir, 'session.json'), session);
    await this.writeJson(join(sessionDir, 'thoughts.json'), []);
    await this.writeJson(join(sessionDir, 'tasks.json'), []);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.readJson(join(this.getSessionDir(sessionId), 'session.json'));
  }

  async updateSession(session: Session): Promise<void> {
    await this.writeJson(join(this.getSessionDir(session.id), 'session.json'), session);
  }

  async listSessions(): Promise<Session[]> {
    const sessionsDir = join(this.dataPath, 'sessions');
    await this.ensureDir(sessionsDir);
    
    try {
      const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
      const sessions: Session[] = [];
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const session = await this.getSession(entry.name);
          if (session) sessions.push(session);
        }
      }
      
      return sessions;
    } catch {
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionDir(sessionId);
    await fs.rm(sessionDir, { recursive: true, force: true });
  }

  // Thought operations
  async saveThought(thought: ThoughtRecord): Promise<void> {
    const filePath = join(this.getSessionDir(thought.sessionId), 'thoughts.json');
    const thoughts = await this.readJson<ThoughtRecord[]>(filePath) || [];
    thoughts.push(thought);
    await this.writeJson(filePath, thoughts);
  }

  async getThoughts(sessionId: string): Promise<ThoughtRecord[]> {
    return await this.readJson(join(this.getSessionDir(sessionId), 'thoughts.json')) || [];
  }

  // Task operations
  async saveTask(task: TaskCommit): Promise<void> {
    const filePath = join(this.getSessionDir(task.sessionId), 'tasks.json');
    const tasks = await this.readJson<TaskCommit[]>(filePath) || [];
    tasks.push(task);
    await this.writeJson(filePath, tasks);
  }

  async getTask(sessionId: string, taskId: string): Promise<TaskCommit | null> {
    const tasks = await this.getTasks(sessionId);
    return tasks.find(t => t.taskId === taskId) || null;
  }

  async getTasks(sessionId: string): Promise<TaskCommit[]> {
    return await this.readJson(join(this.getSessionDir(sessionId), 'tasks.json')) || [];
  }

  async updateTask(task: TaskCommit): Promise<void> {
    const filePath = join(this.getSessionDir(task.sessionId), 'tasks.json');
    const tasks = await this.readJson<TaskCommit[]>(filePath) || [];
    const index = tasks.findIndex(t => t.taskId === task.taskId);
    if (index >= 0) {
      tasks[index] = task;
      await this.writeJson(filePath, tasks);
    }
  }

  // Documentation operations
  async saveDocumentation(doc: DocumentationEntry): Promise<void> {
    await this.writeJson(join(this.getSessionDir(doc.sessionId), 'documentation.json'), doc);
  }

  async getDocumentation(sessionId: string): Promise<DocumentationEntry | null> {
    return this.readJson(join(this.getSessionDir(sessionId), 'documentation.json'));
  }
}

