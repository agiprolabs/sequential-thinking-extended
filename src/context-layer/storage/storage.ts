/**
 * Abstract Storage Interface
 * Defines the contract for persistence implementations
 */

import type { Session, ThoughtRecord, TaskCommit, DocumentationEntry } from '../types.js';

export interface Storage {
  // Session operations
  createSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(session: Session): Promise<void>;
  listSessions(): Promise<Session[]>;
  deleteSession(sessionId: string): Promise<void>;

  // Thought operations
  saveThought(thought: ThoughtRecord): Promise<void>;
  getThoughts(sessionId: string): Promise<ThoughtRecord[]>;
  
  // Task operations
  saveTask(task: TaskCommit): Promise<void>;
  getTask(sessionId: string, taskId: string): Promise<TaskCommit | null>;
  getTasks(sessionId: string): Promise<TaskCommit[]>;
  updateTask(task: TaskCommit): Promise<void>;

  // Documentation operations
  saveDocumentation(doc: DocumentationEntry): Promise<void>;
  getDocumentation(sessionId: string): Promise<DocumentationEntry | null>;
}

