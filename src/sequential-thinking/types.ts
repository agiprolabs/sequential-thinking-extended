/**
 * Types for the Sequential Thinking Layer 1
 */

export interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
}

export interface ThoughtResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface ThoughtOutput {
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  branches: string[];
  thoughtHistoryLength: number;
}

