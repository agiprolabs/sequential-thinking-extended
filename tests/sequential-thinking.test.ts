import { describe, it, expect, beforeEach } from 'vitest';
import { SequentialThinkingServer } from '../src/sequential-thinking/lib.js';
import type { ThoughtData } from '../src/sequential-thinking/types.js';

describe('SequentialThinkingServer', () => {
  let server: SequentialThinkingServer;

  beforeEach(() => {
    server = new SequentialThinkingServer();
  });

  describe('processThought', () => {
    it('should process a basic thought and return result with content', () => {
      const input: ThoughtData = {
        thought: 'This is a test thought',
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
      };

      const result = server.processThought(input);

      expect(result.content).toBeDefined();
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.thoughtNumber).toBe(1);
      expect(parsed.totalThoughts).toBe(3);
      expect(parsed.nextThoughtNeeded).toBe(true);
      expect(parsed.thoughtHistoryLength).toBe(1);
    });

    it('should track thought history across multiple thoughts', () => {
      const thought1: ThoughtData = {
        thought: 'First thought',
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
      };

      const thought2: ThoughtData = {
        thought: 'Second thought',
        thoughtNumber: 2,
        totalThoughts: 3,
        nextThoughtNeeded: true,
      };

      server.processThought(thought1);
      const result = server.processThought(thought2);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.thoughtHistoryLength).toBe(2);
    });

    it('should store revision info in thought history', () => {
      const thought1: ThoughtData = {
        thought: 'Original thought',
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
      };

      const revision: ThoughtData = {
        thought: 'Revised thought',
        thoughtNumber: 2,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        isRevision: true,
        revisesThought: 1,
      };

      server.processThought(thought1);
      server.processThought(revision);

      const history = server.getThoughtHistory();
      expect(history[1].isRevision).toBe(true);
      expect(history[1].revisesThought).toBe(1);
    });

    it('should track branches correctly', () => {
      const thought1: ThoughtData = {
        thought: 'Main path thought',
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
      };

      const branch: ThoughtData = {
        thought: 'Alternative approach',
        thoughtNumber: 2,
        totalThoughts: 4,
        nextThoughtNeeded: true,
        branchFromThought: 1,
        branchId: 'alternative-a',
      };

      server.processThought(thought1);
      const result = server.processThought(branch);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.branches).toContain('alternative-a');

      const branches = server.getBranches();
      expect(branches['alternative-a']).toBeDefined();
      expect(branches['alternative-a'].length).toBe(1);
    });

    it('should store needsMoreThoughts flag in history', () => {
      const thought: ThoughtData = {
        thought: 'Need to extend thinking',
        thoughtNumber: 3,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        needsMoreThoughts: true,
      };

      server.processThought(thought);

      const history = server.getThoughtHistory();
      expect(history[0].needsMoreThoughts).toBe(true);
    });

    it('should mark final thought correctly', () => {
      const finalThought: ThoughtData = {
        thought: 'Final conclusion',
        thoughtNumber: 3,
        totalThoughts: 3,
        nextThoughtNeeded: false,
      };

      const result = server.processThought(finalThought);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.nextThoughtNeeded).toBe(false);
    });
  });

  describe('getThoughtHistory', () => {
    it('should return accumulated thought history', () => {
      server.processThought({
        thought: 'First',
        thoughtNumber: 1,
        totalThoughts: 2,
        nextThoughtNeeded: true,
      });
      server.processThought({
        thought: 'Second',
        thoughtNumber: 2,
        totalThoughts: 2,
        nextThoughtNeeded: false,
      });

      const history = server.getThoughtHistory();
      expect(history.length).toBe(2);
      expect(history[0].thought).toBe('First');
      expect(history[1].thought).toBe('Second');
    });
  });
});

