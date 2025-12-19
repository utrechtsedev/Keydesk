import { Queue, Worker, type Job } from 'bullmq';
import { createClient } from 'redis';
import { logger } from '../logger';
import type { NotificationOptions } from '$lib/types';

// ============================================================================
// REDIS CONNECTION & DETECTION
// ============================================================================

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
};

let isRedisAvailable = false;
let queue: Queue | null = null;

/**
 * Check if Redis is available
 */
async function checkRedisConnection(): Promise<boolean> {
  try {
    const client = createClient({
      socket: {
        host: connection.host,
        port: connection.port,
        connectTimeout: 2000,
      },
    });

    await client.connect();
    await client.ping();
    await client.quit();
    isRedisAvailable = true;

    logger.info('Redis connection successful - Queue mode enabled');
    return true;
  } catch {
    logger.warn('Redis not available - Running in direct execution mode');
    return false;
  }
}

/**
 * Initialize the queue system
 */
export async function initializeQueue(): Promise<void> {
  isRedisAvailable = await checkRedisConnection();

  if (isRedisAvailable) {
    queue = new Queue('jobs', { connection });
    logger.info('BullMQ Queue initialized');
  }
}

// ============================================================================
// JOB HANDLER REGISTRY
// ============================================================================

type JobHandler = (data: unknown) => Promise<void>;
const handlers = new Map<string, JobHandler>();

/**
 * Register a job handler
 */
export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

/**
 * Get a registered handler
 */
export function getHandler(type: string): JobHandler | undefined {
  return handlers.get(type);
}

// ============================================================================
// JOB ENQUEUEING
// ============================================================================

interface EnqueueOptions {
  delay?: number;
  priority?: number;
  attempts?: number;
}

/**
 * Enqueue a job (or execute directly if Redis unavailable)
 */
export async function enqueue(
  type: string,
  data: unknown,
  options?: EnqueueOptions
): Promise<void> {
  if (isRedisAvailable && queue) {
    await queue.add(type, data, {
      attempts: options?.attempts ?? 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      delay: options?.delay,
      priority: options?.priority,
      removeOnComplete: {
        count: 100,
      },
      removeOnFail: {
        count: 1000,
      },
    });
    logger.info(`Job "${type}" queued`);
    return;
  }

  logger.warn(`Executing job "${type}" directly (no Redis)`);
  const handler = handlers.get(type);

  if (!handler) {
    throw new Error(`No handler registered for job: ${type}`);
  }

  try {
    await handler(data);
  } catch (error) {
    logger.error({ error }, `Failed to execute job "${type}":`);
  }
}

// ============================================================================
// WORKER
// ============================================================================

/**
 * Start the worker (only if Redis is available)
 */
export async function startJobWorker(): Promise<Worker | null> {
  await checkRedisConnection();
  if (!isRedisAvailable) {
    logger.warn('Worker not started - Redis not available');
    return null;
  }

  const worker = new Worker(
    'jobs',
    async (job: Job) => {
      const handler = handlers.get(job.name);
      if (!handler) {
        throw new Error(`No handler registered for job: ${job.name}`);
      }
      await handler(job.data);
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, error) => {
    logger.error({ error }, `Job ${job?.id} (${job?.name}) failed`);
  });

  worker.on('error', (error) => {
    logger.error({ error }, 'Worker error');
  });

  logger.info('Job worker started');
  return worker;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Enqueue notification job
 */
export async function sendNotification(data: NotificationOptions, options?: EnqueueOptions): Promise<void> {
  await enqueue('send-notification', data, options);
}
