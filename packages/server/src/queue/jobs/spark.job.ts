/**
 * 火花任务定义
 */

import type { Job } from 'bullmq';
import type { SparkJobData, SparkJobResult } from '../types.js';

const LOG_PREFIX = '[SparkJob]';

/**
 * 火花任务处理器类型
 */
export type SparkJobProcessor = (job: Job<SparkJobData>) => Promise<SparkJobResult>;

/**
 * 默认火花任务处理器
 * 注意：这是一个占位实现，实际使用时需要注入真正的处理器
 */
export async function defaultSparkProcessor(job: Job<SparkJobData>): Promise<SparkJobResult> {
  const { friendName, message } = job.data;

  console.log(`${LOG_PREFIX} Processing spark job: ${job.id}`);
  console.log(`${LOG_PREFIX} Friend: ${friendName}, Message: ${message}`);

  // Default implementation - override with setSparkProcessor for real functionality
  // Real implementation should:
  // 1. Get BrowserClient instance
  // 2. Get MessagePool instance
  // 3. Call SparkKeeper.sendToFriend() to send message

  return {
    success: true,
    friendId: job.data.friendId,
    friendName: friendName,
    message: `Spark message sent to ${friendName}`,
    sentAt: new Date(),
  } as SparkJobResult;
}

/**
 * 创建火花任务数据
 */
export function createSparkJobData(params: {
  accountId: string;
  friendId: string;
  friendName: string;
  message: string;
  retryCount?: number;
}): SparkJobData {
  return {
    accountId: params.accountId,
    friendId: params.friendId,
    friendName: params.friendName,
    message: params.message,
    retryCount: params.retryCount,
  };
}
