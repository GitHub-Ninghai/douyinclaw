/**
 * BullMQ 任务队列模块
 * 提供任务队列管理能力
 */

// 导出类型
export type {
  SparkJobData,
  SparkJobResult,
  ReplyJobData,
  ReplyJobResult,
  HeartbeatJobData,
  MessageCheckJobData,
  RedisConfig,
  QueueConfig,
  CronConfig,
  QueueStats,
  JobProcessor,
  QueueName,
} from './types.js';

export { QUEUE_NAMES } from './types.js';

// 导出队列管理器
export { QueueManager } from './queue-manager.js';

// 导出任务定义
export {
  defaultSparkProcessor,
  createSparkJobData,
  type SparkJobProcessor,
} from './jobs/spark.job.js';

export {
  defaultReplyProcessor,
  createReplyJobData,
  type ReplyJobProcessor,
} from './jobs/reply.job.js';
