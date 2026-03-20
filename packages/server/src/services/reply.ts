/**
 * 回复服务
 */

import type { ReplyLog, PaginatedResponse } from '@douyinclaw/shared';
import { replyLogService, accountService, friendService } from '@douyinclaw/core';

interface ReplyLogQueryOptions {
  page: number;
  pageSize: number;
  friendId?: string;
  status?: 'pending' | 'sent' | 'rejected';
}

interface GenerateReplyOptions {
  friendId: string;
  videoUrl?: string;
  videoTitle?: string;
  originalMessage?: string;
}

/**
 * 获取回复日志
 */
export async function getReplyLogs(options: ReplyLogQueryOptions): Promise<PaginatedResponse<ReplyLog>> {
  const { page, pageSize, friendId, status } = options;

  const activeAccount = await accountService.getActive();

  if (!activeAccount) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    };
  }

  const limit = pageSize;
  const offset = (page - 1) * pageSize;

  const logs = await replyLogService.getList({
    accountId: activeAccount.id,
    friendId,
    status,
    limit,
    offset,
  });

  // 转换为前端格式
  const items: ReplyLog[] = logs.map(log => ({
    id: log.id,
    friendId: log.friendId,
    videoTitle: log.videoTitle ?? '',
    videoUrl: log.videoUrl ?? undefined,
    aiReply: log.aiReply,
    status: log.status as 'pending' | 'sent' | 'rejected',
    sentAt: log.sentAt ?? new Date(),
  }));

  return {
    items,
    total: logs.length,
    page,
    pageSize,
    hasMore: offset + pageSize < logs.length,
  };
}

/**
 * 获取待审批的回复
 */
export async function getPendingReplies(): Promise<ReplyLog[]> {
  const activeAccount = await accountService.getActive();
  if (!activeAccount) {
    return [];
  }

  const logs = await replyLogService.getPending(activeAccount.id);

  return logs.map(log => ({
    id: log.id,
    friendId: log.friendId,
    videoTitle: log.videoTitle ?? '',
    videoUrl: log.videoUrl ?? undefined,
    aiReply: log.aiReply,
    status: 'pending' as const,
    sentAt: log.sentAt ?? new Date(),
  }));
}

/**
 * 生成回复
 */
export async function generateReply(options: GenerateReplyOptions): Promise<ReplyLog> {
  const { friendId, videoUrl, videoTitle } = options;

  const activeAccount = await accountService.getActive();
  if (!activeAccount) {
    throw new Error('No active account');
  }

  const friend = await friendService.getById(friendId);
  if (!friend) {
    throw new Error('Friend not found');
  }

  // 生成 AI 回复
  const aiReply = await generateAIReply(videoTitle || '');

  // 创建日志记录
  await replyLogService.create({
    accountId: activeAccount.id,
    friendId,
    friendName: friend.nickname,
    videoTitle,
    videoUrl,
    aiReply,
    status: 'pending',
  });

  const log: ReplyLog = {
    id: generateId(),
    friendId,
    videoTitle: videoTitle || '',
    videoUrl,
    aiReply,
    status: 'pending',
    sentAt: new Date(),
  };

  return log;
}

/**
 * 批准回复
 */
export async function approveReply(id: string): Promise<ReplyLog> {
  const log = await replyLogService.getById(id);
  if (!log) {
    throw new Error(`Reply log not found: ${id}`);
  }

  // 更新状态为已发送
  const updated = await replyLogService.updateStatus(id, 'sent');

  return {
    id: updated!.id,
    friendId: updated!.friendId,
    videoTitle: updated!.videoTitle ?? '',
    videoUrl: updated!.videoUrl ?? undefined,
    aiReply: updated!.aiReply,
    status: 'sent',
    sentAt: updated!.sentAt ?? new Date(),
  };
}

/**
 * 拒绝回复
 */
export async function rejectReply(id: string): Promise<ReplyLog> {
  const log = await replyLogService.getById(id);
  if (!log) {
    throw new Error(`Reply log not found: ${id}`);
  }

  // 更新状态为已拒绝
  const updated = await replyLogService.updateStatus(id, 'rejected');

  return {
    id: updated!.id,
    friendId: updated!.friendId,
    videoTitle: updated!.videoTitle ?? '',
    videoUrl: updated!.videoUrl ?? undefined,
    aiReply: updated!.aiReply,
    status: 'rejected',
    sentAt: updated!.sentAt ?? new Date(),
  };
}

/**
 * 生成 AI 回复（模拟）
 */
async function generateAIReply(videoTitle: string): Promise<string> {
  // TODO: 调用 @douyinclaw/core 的 AI 服务
  // 这里是模拟实现
  if (videoTitle) {
    return `这个视频很有意思！${videoTitle}`;
  }
  return '收到啦~';
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `reply_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
