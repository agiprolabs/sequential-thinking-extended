/**
 * Event Publisher
 * Publishes events to Redis for the doc-worker to consume
 */

import { Redis } from 'ioredis';

export interface DevPatternEvent {
  type: 'session.thought' | 'session.task_completed' | 'session.finalized' | 'session.idle_timeout';
  sessionId: string;
  tenantId?: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export class EventPublisher {
  private redis: Redis | null = null;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },
          lazyConnect: true, // Don't connect immediately
        });

        this.redis.on('error', (err) => {
          console.error('[EventPublisher] Redis error:', err.message);
        });
      } catch (error) {
        console.error('[EventPublisher] Failed to create Redis client:', error);
      }
    } else {
      console.error('[EventPublisher] No REDIS_URL configured, events will not be published');
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.redis) return false;

    const status = this.redis.status as string;

    // If already connected, return true
    if (status === 'ready' || status === 'connect') return true;

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      await this.connectionPromise;
      const newStatus = this.redis.status as string;
      return newStatus === 'ready' || newStatus === 'connect';
    }

    // Start connection
    this.connectionPromise = this.redis.connect()
      .then(() => {
        console.error('[EventPublisher] Connected to Redis');
      })
      .catch((err) => {
        console.error('[EventPublisher] Failed to connect to Redis:', err.message);
      });

    await this.connectionPromise;
    const finalStatus = this.redis.status as string;
    return finalStatus === 'ready' || finalStatus === 'connect';
  }

  async publish(event: DevPatternEvent): Promise<void> {
    const connected = await this.ensureConnected();
    if (!connected) {
      console.error('[EventPublisher] Not connected to Redis, skipping event');
      return;
    }

    try {
      await this.redis!.publish('devpattern:events', JSON.stringify(event));
      console.error(`[EventPublisher] Published ${event.type} for session ${event.sessionId}`);
    } catch (error) {
      console.error('[EventPublisher] Failed to publish event:', error);
    }
  }

  async publishSessionFinalized(params: {
    sessionId: string;
    tenantId?: string;
    thoughtCount: number;
    taskCount: number;
    tier?: string;
    outcome?: string;
  }): Promise<void> {
    const event: DevPatternEvent = {
      type: 'session.finalized',
      sessionId: params.sessionId,
      tenantId: params.tenantId,
      timestamp: new Date().toISOString(),
      payload: {
        thoughtCount: params.thoughtCount,
        taskCount: params.taskCount,
        tier: params.tier || 'basic',
        outcome: params.outcome || 'completed',
      },
    };

    await this.publish(event);
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.connectionPromise = null;
    }
  }
}

// Singleton instance
let eventPublisher: EventPublisher | null = null;

export function getEventPublisher(): EventPublisher {
  if (!eventPublisher) {
    eventPublisher = new EventPublisher();
  }
  return eventPublisher;
}

