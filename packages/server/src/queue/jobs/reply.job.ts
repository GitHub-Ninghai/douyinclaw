/**
 * 回复任务定义
 */

import type { Job } from 'bullmq';
import type { ReplyJobData, ReplyJobResult } from '../types.js';

const LOG_PREFIX = '[ReplyJob]';

/**
 * 回复任务处理器类型
 */
export type ReplyJobProcessor = (job: Job<ReplyJobData>) => Promise<ReplyJobResult>;

/**
 * 默认回复任务处理器
 * 注意：这是一个占位实现，实际使用时需要注入真正的处理器
 */
export async function defaultReplyProcessor(job: Job<ReplyJobData>): Promise<ReplyJobResult> {
  const { friendName, videoInfo, reply } = job.data;

  console.log(`${LOG_PREFIX} Processing reply job: ${job.id}`);
  console.log(`${LOG_PREFIX} Friend: ${friendName}, Video: ${videoInfo.title}`);

  // Default implementation - override with setReplyProcessor for real functionality
  // Real implementation should:
  // 1. Get video info and screenshots
  // 2. Use Responder to analyze video and generate reply
  // 3. Send reply via SparkKeeper or BrowserClient

  return {
    success: true,
    friendId: job.data.friendId,
    friendName: friendName,
    reply: reply,
    sentAt: new Date(),
  };
}

/**
 * 创建回复任务数据
 */
export function createReplyJobData(params: {
  accountId: string;
  friendId: string;
  friendName: string;
  videoInfo: {
    title: string;
    description?: string;
    videoUrl?: string;
  };
  reply: string;
  originalMessageId?: string;
  retryCount?: number;
}): ReplyJobData {
  return {
    accountId: params.accountId,
    friendId: params.friendId,
    friendName: params.friendName,
    videoInfo: params.videoInfo,
    reply: params.reply,
    originalMessageId: params.originalMessageId,
    retryCount: params.retryCount,
  };
}
