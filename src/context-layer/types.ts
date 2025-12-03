/**
 * Types for the Context Layer (Layer 2)
 */

export interface ThoughtRecord {
  sessionId: string;
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  branchId?: string;
  isRevision?: boolean;
  revisesThought?: number;
  timestamp: Date;
}

export interface TaskCommit {
  sessionId: string;
  taskId: string;
  taskTitle: string;
  description?: string;
  completedAtThought: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed';
  thoughtCount: number;
  taskCount: number;
  metadata?: Record<string, unknown>;
}

export interface SessionContext {
  session: Session;
  thoughts: ThoughtRecord[];
  tasks: TaskCommit[];
}

export interface DocumentationEntry {
  sessionId: string;
  generatedAt: Date;
  summary: string;
  thoughtCount: number;
  taskCount: number;
  branches: string[];
  content: string;
}

export interface TaskContext {
  taskId?: string;
  taskTitle?: string;
  description?: string;
  commitTask?: boolean;
}

export interface ExtendedThoughtInput {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  // Layer 2 extensions
  sessionId?: string;
  taskContext?: TaskContext;
}

export interface ExtendedThoughtOutput {
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  branches: string[];
  thoughtHistoryLength: number;
  // Layer 2 additions
  sessionId: string;
  persistedContext: boolean;
}

