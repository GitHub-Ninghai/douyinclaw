/**
 * BullMQ 任务队列类型定义
 */

import type { Job } from 'bullmq';

// Redis 客户端类型 - 使用 any 避免 ESM 导入问题
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RedisClient = any;

// ==================== 任务数据类型 ====================

/**
 * 火花发送任务数据
 */
export interface SparkJobData {
  /** 账号 ID */
  accountId: string;
  /** 好友 ID */
  friendId: string;
  /** 好友名称 */
  friendName: string;
  /** 发送的消息内容 */
  message: string;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 火花任务结果
 */
export interface SparkJobResult {
  success: boolean;
  friendId: string;
  friendName: string;
  message?: string;
  error?: string;
  sentAt: Date;
}

/**
 * 回复任务数据
 */
export interface ReplyJobData {
  /** 账号 ID */
  accountId: string;
  /** 好友 ID */
  friendId: string;
  /** 好友名称 */
  friendName: string;
  /** 视频信息 */
  videoInfo: {
    title: string;
    description?: string;
    videoUrl?: string;
  };
  /** AI 生成的回复内容 */
  reply: string;
  /** 原始消息 ID (用于关联) */
  originalMessageId?: string;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 回复任务结果
 */
export interface ReplyJobResult {
  success: boolean;
  friendId: string;
  friendName: string;
  reply?: string;
  error?: string;
  sentAt: Date;
}

/**
 * 心跳任务数据
 */
export interface HeartbeatJobData {
  /** 账号 ID */
  accountId: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 消息检查任务数据
 */
export interface MessageCheckJobData {
  /** 账号 ID */
  accountId: string;
  /** 检查时间戳 */
  timestamp: number;
}

// ==================== 队列配置类型 ====================

/**
 * Redis 连接配置
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number | null;
}

/**
 * 队列配置
 */
export interface QueueConfig {
  /** Redis 连接配置 */
  redis: RedisConfig;
  /** 火花任务并发数 */
  sparkConcurrency?: number;
  /** 回复任务并发数 */
  replyConcurrency?: number;
  /** 任务默认超时时间 (ms) */
  defaultJobTimeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 退避策略基础延迟 (ms) */
  backoffDelay?: number;
}

/**
 * 定时任务配置
 */
export interface CronConfig {
  /** 火花发送定时任务 1 */
  sparkCron1: string;
  /** 火花发送定时任务 2 */
  sparkCron2: string;
  /** 消息检查间隔 (ms) */
  messageCheckInterval: number;
  /** 会话心跳间隔 (ms) */
  sessionHeartbeatInterval: number;
}

// ==================== 队列状态类型 ====================

/**
 * 队列统计信息
 */
export interface QueueStats {
  /** 队列名称 */
  name: string;
  /** 等待中的任务数 */
  waiting: number;
  /** 活跃任务数 */
  active: number;
  /** 已完成的任务数 */
  completed: number;
  /** 失败的任务数 */
  failed: number;
  /** 延迟任务数 */
  delayed: number;
}

/**
 * 任务处理器函数类型
 */
export type JobProcessor<T, R> = (job: Job<T>) => Promise<R>;

// ==================== 队列名称常量 ====================

export const QUEUE_NAMES = {
  SPARK: 'spark',
  REPLY: 'reply',
  HEARTBEAT: 'heartbeat',
  MESSAGE_CHECK: 'message_check',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
