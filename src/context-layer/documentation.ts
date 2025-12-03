/**
 * Documentation Generator
 * Auto-generates documentation from thinking sessions
 */

import type { Storage } from './storage/storage.js';
import type { DocumentationEntry, ThoughtRecord, TaskCommit } from './types.js';

export class DocumentationGenerator {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async generate(sessionId: string): Promise<DocumentationEntry> {
    const session = await this.storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const thoughts = await this.storage.getThoughts(sessionId);
    const tasks = await this.storage.getTasks(sessionId);

    // Extract unique branches
    const branches = [...new Set(thoughts.filter(t => t.branchId).map(t => t.branchId!))];

    // Generate documentation content
    const content = this.generateContent(thoughts, tasks, branches);
    const summary = this.generateSummary(thoughts, tasks);

    const doc: DocumentationEntry = {
      sessionId,
      generatedAt: new Date(),
      summary,
      thoughtCount: thoughts.length,
      taskCount: tasks.length,
      branches,
      content,
    };

    await this.storage.saveDocumentation(doc);

    // Mark session as completed
    session.status = 'completed';
    session.updatedAt = new Date();
    await this.storage.updateSession(session);

    return doc;
  }

  private generateSummary(thoughts: ThoughtRecord[], tasks: TaskCommit[]): string {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const revisions = thoughts.filter(t => t.isRevision).length;

    return `Session completed with ${thoughts.length} thoughts, ${revisions} revisions, and ${completedTasks.length} tasks completed.`;
  }

  private generateContent(
    thoughts: ThoughtRecord[],
    tasks: TaskCommit[],
    branches: string[]
  ): string {
    let content = '# Thinking Session Documentation\n\n';

    // Summary section
    content += '## Summary\n\n';
    content += `- Total thoughts: ${thoughts.length}\n`;
    content += `- Total tasks: ${tasks.length}\n`;
    content += `- Branches explored: ${branches.length}\n\n`;

    // Tasks section
    if (tasks.length > 0) {
      content += '## Tasks\n\n';
      for (const task of tasks) {
        const statusEmoji = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
        content += `### ${statusEmoji} ${task.taskTitle}\n\n`;
        if (task.description) {
          content += `${task.description}\n\n`;
        }
        content += `- Status: ${task.status}\n`;
        content += `- Completed at thought: ${task.completedAtThought}\n\n`;
      }
    }

    // Thought progression section
    content += '## Thought Progression\n\n';
    for (const thought of thoughts) {
      const prefix = thought.isRevision ? '🔄 [Revision]' : thought.branchId ? `🌿 [Branch: ${thought.branchId}]` : '💭';
      content += `### ${prefix} Thought ${thought.thoughtNumber}/${thought.totalThoughts}\n\n`;
      content += `${thought.thought}\n\n`;
    }

    return content;
  }

  async getDocumentation(sessionId: string): Promise<DocumentationEntry | null> {
    return this.storage.getDocumentation(sessionId);
  }
}

