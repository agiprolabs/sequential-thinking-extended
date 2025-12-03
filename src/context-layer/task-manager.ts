/**
 * Task Manager
 * Handles task lifecycle and commits
 */

import { randomUUID } from 'crypto';
import type { Storage } from './storage/storage.js';
import type { TaskCommit, TaskContext } from './types.js';

export class TaskManager {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async commitTask(params: {
    sessionId: string;
    taskId?: string;
    taskTitle?: string;
    description?: string;
    completedAtThought: number;
  }): Promise<TaskCommit> {
    const taskId = params.taskId || `task_${randomUUID().slice(0, 12)}`;
    const now = new Date();

    const task: TaskCommit = {
      sessionId: params.sessionId,
      taskId,
      taskTitle: params.taskTitle || 'Untitled Task',
      description: params.description,
      completedAtThought: params.completedAtThought,
      status: 'completed',
      createdAt: now,
      completedAt: now,
    };

    await this.storage.saveTask(task);

    // Update session task count
    const session = await this.storage.getSession(params.sessionId);
    if (session) {
      session.taskCount++;
      session.updatedAt = now;
      await this.storage.updateSession(session);
    }

    return task;
  }

  async createTask(params: {
    sessionId: string;
    taskTitle: string;
    description?: string;
  }): Promise<TaskCommit> {
    const taskId = `task_${randomUUID().slice(0, 12)}`;
    const now = new Date();

    const task: TaskCommit = {
      sessionId: params.sessionId,
      taskId,
      taskTitle: params.taskTitle,
      description: params.description,
      completedAtThought: 0,
      status: 'pending',
      createdAt: now,
    };

    await this.storage.saveTask(task);
    return task;
  }

  async updateTaskStatus(
    sessionId: string,
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed',
    completedAtThought?: number
  ): Promise<void> {
    const task = await this.storage.getTask(sessionId, taskId);
    if (task) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
        if (completedAtThought !== undefined) {
          task.completedAtThought = completedAtThought;
        }
      }
      await this.storage.updateTask(task);
    }
  }

  async getTasks(sessionId: string): Promise<TaskCommit[]> {
    return this.storage.getTasks(sessionId);
  }

  shouldCommitTask(taskContext?: TaskContext): boolean {
    return taskContext?.commitTask === true;
  }
}

