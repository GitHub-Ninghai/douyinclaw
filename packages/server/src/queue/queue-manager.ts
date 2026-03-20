/**
 * BullMQ 队列管理器
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import cron from 'node-cron';

import type {
  SparkJobData,
  SparkJobResult,
  ReplyJobData,
  ReplyJobResult,
  QueueConfig,
  CronConfig,
  QueueStats,
  JobProcessor,
  RedisClient,
} from './types.js';
import { QUEUE_NAMES } from './types.js';
import { defaultSparkProcessor, SparkJobProcessor } from './jobs/spark.job.js';
import { defaultReplyProcessor, ReplyJobProcessor } from './jobs/reply.job.js';

const LOG_PREFIX = '[QueueManager]';

/**
 * 默认队列配置
 */
const DEFAULT_CONFIG: Partial<QueueConfig> = {
  sparkConcurrency: 5,
  replyConcurrency: 3,
  defaultJobTimeout: 60000, // 1 minute
  maxRetries: 3,
  backoffDelay: 5000, // 5 seconds
};

/**
 * 默认定时任务配置
 */
const DEFAULT_CRON_CONFIG: CronConfig = {
  sparkCron1: '0 8 * * *', // Every day at 8:00 AM
  sparkCron2: '0 20 * * *', // Every day at 8:00 PM
  messageCheckInterval: 60000, // 1 minute
  sessionHeartbeatInterval: 300000, // 5 minutes
};

/**
 * 队列管理器
 * 负责管理 BullMQ 队列和定时任务调度
 */
export class QueueManager {
  private connection: RedisClient;
  private config: QueueConfig;
  private cronConfig: CronConfig;

  // Queues
  private sparkQueue!: Queue<SparkJobData>;
  private replyQueue!: Queue<ReplyJobData>;

  // Workers
  private sparkWorker!: Worker<SparkJobData>;
  private replyWorker!: Worker<ReplyJobData>;

  // Processors (can be overridden)
  private sparkProcessor: JobProcessor<SparkJobData, SparkJobResult>;
  private replyProcessor: JobProcessor<ReplyJobData, ReplyJobResult>;

  // Cron jobs
  private cronJobs: cron.ScheduledTask[] = [];

  // State
  private initialized = false;

  constructor(config: QueueConfig, cronConfig?: Partial<CronConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cronConfig = { ...DEFAULT_CRON_CONFIG, ...cronConfig };

    // Create Redis connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.connection = new (Redis as any)({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db ?? 0,
      maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest ?? null,
    });

    // Set default processors
    this.sparkProcessor = defaultSparkProcessor;
    this.replyProcessor = defaultReplyProcessor;
  }

  /**
   * 初始化队列管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log(`${LOG_PREFIX} Already initialized`);
      return;
    }

    console.log(`${LOG_PREFIX} Initializing queue manager...`);

    // Create queues
    this.sparkQueue = new Queue<SparkJobData>(QUEUE_NAMES.SPARK, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: this.config.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.config.backoffDelay,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep up to 1000 completed jobs
        },
        removeOnFail: {
          age: 24 * 3600, // Keep failed jobs for 24 hours
        },
      },
    });

    this.replyQueue = new Queue<ReplyJobData>(QUEUE_NAMES.REPLY, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: this.config.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.config.backoffDelay,
        },
        removeOnComplete: {
          age: 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 24 * 3600,
        },
      },
    });

    // Create workers
    this.sparkWorker = new Worker<SparkJobData>(
      QUEUE_NAMES.SPARK,
      async (job: Job<SparkJobData>) => {
        return this.sparkProcessor(job);
      },
      {
        connection: this.connection,
        concurrency: this.config.sparkConcurrency,
      }
    );

    this.replyWorker = new Worker<ReplyJobData>(
      QUEUE_NAMES.REPLY,
      async (job: Job<ReplyJobData>) => {
        return this.replyProcessor(job);
      },
      {
        connection: this.connection,
        concurrency: this.config.replyConcurrency,
      }
    );

    // Set up event listeners
    this.setupEventListeners();

    // Set up cron jobs
    this.setupCronJobs();

    this.initialized = true;
    console.log(`${LOG_PREFIX} Queue manager initialized successfully`);
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // Spark worker events
    this.sparkWorker.on('completed', (job: Job<SparkJobData>, result: SparkJobResult) => {
      console.log(`${LOG_PREFIX} Spark job ${job.id} completed:`, result);
    });

    this.sparkWorker.on('failed', (job: Job<SparkJobData> | undefined, error: Error) => {
      console.error(`${LOG_PREFIX} Spark job ${job?.id} failed:`, error.message);
    });

    // Reply worker events
    this.replyWorker.on('completed', (job: Job<ReplyJobData>, result: ReplyJobResult) => {
      console.log(`${LOG_PREFIX} Reply job ${job.id} completed:`, result);
    });

    this.replyWorker.on('failed', (job: Job<ReplyJobData> | undefined, error: Error) => {
      console.error(`${LOG_PREFIX} Reply job ${job?.id} failed:`, error.message);
    });
  }

  /**
   * 设置定时任务
   */
  private setupCronJobs(): void {
    console.log(`${LOG_PREFIX} Setting up cron jobs...`);

    // Spark cron 1
    if (cron.validate(this.cronConfig.sparkCron1)) {
      const job1 = cron.schedule(this.cronConfig.sparkCron1, () => {
        console.log(`${LOG_PREFIX} Spark cron 1 triggered at ${new Date().toISOString()}`);
        // Emit event or call callback for spark batch processing
        this.sparkQueue.add('spark-batch-1', {
          accountId: 'default',
          friendId: 'batch',
          friendName: 'Batch Processing',
          message: 'Scheduled spark batch',
        });
      });
      this.cronJobs.push(job1);
      console.log(`${LOG_PREFIX} Spark cron 1 scheduled: ${this.cronConfig.sparkCron1}`);
    }

    // Spark cron 2
    if (cron.validate(this.cronConfig.sparkCron2)) {
      const job2 = cron.schedule(this.cronConfig.sparkCron2, () => {
        console.log(`${LOG_PREFIX} Spark cron 2 triggered at ${new Date().toISOString()}`);
        this.sparkQueue.add('spark-batch-2', {
          accountId: 'default',
          friendId: 'batch',
          friendName: 'Batch Processing',
          message: 'Scheduled spark batch',
        });
      });
      this.cronJobs.push(job2);
      console.log(`${LOG_PREFIX} Spark cron 2 scheduled: ${this.cronConfig.sparkCron2}`);
    }
  }

  /**
   * 添加火花发送任务
   */
  async addSparkJob(data: SparkJobData): Promise<Job<SparkJobData>> {
    this.ensureInitialized();
    console.log(`${LOG_PREFIX} Adding spark job for friend: ${data.friendName}`);
    return this.sparkQueue.add('spark', data);
  }

  /**
   * 批量添加火花发送任务
   */
  async addSparkJobs(items: SparkJobData[]): Promise<Job<SparkJobData>[]> {
    this.ensureInitialized();
    console.log(`${LOG_PREFIX} Adding ${items.length} spark jobs`);
    const jobs = items.map((data) => ({
      name: 'spark',
      data,
    }));
    return this.sparkQueue.addBulk(jobs);
  }

  /**
   * 添加回复任务
   */
  async addReplyJob(data: ReplyJobData): Promise<Job<ReplyJobData>> {
    this.ensureInitialized();
    console.log(`${LOG_PREFIX} Adding reply job for friend: ${data.friendName}`);
    return this.replyQueue.add('reply', data);
  }

  /**
   * 设置自定义火花处理器
   */
  setSparkProcessor(processor: SparkJobProcessor): void {
    this.sparkProcessor = processor;
    console.log(`${LOG_PREFIX} Custom spark processor set`);
  }

  /**
   * 设置自定义回复处理器
   */
  setReplyProcessor(processor: ReplyJobProcessor): void {
    this.replyProcessor = processor;
    console.log(`${LOG_PREFIX} Custom reply processor set`);
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<QueueStats[]> {
    this.ensureInitialized();

    const [sparkCounts, replyCounts] = await Promise.all([
      this.getQueueCounts(this.sparkQueue),
      this.getQueueCounts(this.replyQueue),
    ]);

    return [
      { name: QUEUE_NAMES.SPARK, ...sparkCounts },
      { name: QUEUE_NAMES.REPLY, ...replyCounts },
    ];
  }

  /**
   * 获取单个队列的计数
   */
  private async getQueueCounts(queue: Queue): Promise<Omit<QueueStats, 'name'>> {
    const [waiting, active, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed: 0, // BullMQ 5.x doesn't have getCompletedCount, need to use getJobs
      failed: 0,
      delayed,
    };
  }

  /**
   * 暂停队列
   */
  async pauseQueue(queueName: 'spark' | 'reply'): Promise<void> {
    this.ensureInitialized();
    if (queueName === 'spark') {
      await this.sparkQueue.pause();
    } else {
      await this.replyQueue.pause();
    }
    console.log(`${LOG_PREFIX} Queue ${queueName} paused`);
  }

  /**
   * 恢复队列
   */
  async resumeQueue(queueName: 'spark' | 'reply'): Promise<void> {
    this.ensureInitialized();
    if (queueName === 'spark') {
      await this.sparkQueue.resume();
    } else {
      await this.replyQueue.resume();
    }
    console.log(`${LOG_PREFIX} Queue ${queueName} resumed`);
  }

  /**
   * 清空队列
   */
  async drainQueue(queueName: 'spark' | 'reply'): Promise<void> {
    this.ensureInitialized();
    if (queueName === 'spark') {
      await this.sparkQueue.drain();
    } else {
      await this.replyQueue.drain();
    }
    console.log(`${LOG_PREFIX} Queue ${queueName} drained`);
  }

  /**
   * 更新定时任务配置
   */
  updateCronConfig(config: Partial<CronConfig>): void {
    // Stop existing cron jobs
    this.cronJobs.forEach((job) => job.stop());
    this.cronJobs = [];

    // Update config and restart
    this.cronConfig = { ...this.cronConfig, ...config };
    this.setupCronJobs();
    console.log(`${LOG_PREFIX} Cron config updated`);
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('QueueManager not initialized. Call initialize() first.');
    }
  }

  /**
   * 关闭队列管理器
   */
  async close(): Promise<void> {
    console.log(`${LOG_PREFIX} Closing queue manager...`);

    // Stop cron jobs
    this.cronJobs.forEach((job) => job.stop());
    this.cronJobs = [];

    // Close workers
    if (this.sparkWorker) {
      await this.sparkWorker.close();
    }
    if (this.replyWorker) {
      await this.replyWorker.close();
    }

    // Close queues
    if (this.sparkQueue) {
      await this.sparkQueue.close();
    }
    if (this.replyQueue) {
      await this.replyQueue.close();
    }

    // Close Redis connection
    await this.connection.quit();

    this.initialized = false;
    console.log(`${LOG_PREFIX} Queue manager closed`);
  }

  /**
   * 获取 Redis 连接 (用于其他模块)
   */
  getConnection(): RedisClient {
    return this.connection;
  }

  /**
   * 获取火花队列实例
   */
  getSparkQueue(): Queue<SparkJobData> {
    this.ensureInitialized();
    return this.sparkQueue;
  }

  /**
   * 获取回复队列实例
   */
  getReplyQueue(): Queue<ReplyJobData> {
    this.ensureInitialized();
    return this.replyQueue;
  }
}

export default QueueManager;
