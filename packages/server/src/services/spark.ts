/**
 * 火花服务
 */

import type { SparkLog, SparkResult, PaginatedResponse } from '@douyinclaw/shared';
import { friendService, accountService, sparkLogService, messagePoolService } from '@douyinclaw/core';

interface SparkLogQueryOptions {
  page: number;
  pageSize: number;
  friendId?: string;
}

/**
 * 发送火花消息
 */
export async function sendSparkMessage(friendId: string, customMessage?: string): Promise<SparkResult> {
  const activeAccount = await accountService.getActive();

  if (!activeAccount) {
    throw new Error('No active account');
  }

  const friend = await friendService.getById(friendId);
  if (!friend) {
    throw new Error('Friend not found');
  }

  try {
    // 获取随机消息或使用自定义消息
    let messageContent = customMessage;
    if (!messageContent) {
      const randomMessage = await messagePoolService.getRandomSparkMessage();
      messageContent = randomMessage?.content ?? '早安！今天也要元气满满哦~';
    }

    // 记录日志
    await sparkLogService.create({
      accountId: activeAccount.id,
      friendId: friend.id,
      friendName: friend.nickname,
      message: messageContent,
      status: 'success',
      sentAt: new Date(),
    });

    // 更新好友最后交互时间
    await friendService.updateSparkDays(friend.id, friend.sparkDays + 1);

    return {
      friendId: friend.id,
      friendName: friend.nickname,
      status: 'success',
      message: messageContent,
      sentAt: new Date(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await sparkLogService.create({
      accountId: activeAccount.id,
      friendId: friend.id,
      friendName: friend.nickname,
      message: customMessage ?? 'Failed to send spark',
      status: 'failed',
      errorMessage,
      sentAt: new Date(),
    });
    return {
      friendId: friend.id,
      friendName: friend.nickname,
      status: 'failed',
      error: errorMessage,
      sentAt: new Date(),
    };
  }
}

/**
 * 向所有启用火花的好友发送火花
 */
export async function sendSparkToAll(): Promise<SparkResult[]> {
  const activeAccount = await accountService.getActive();
  if (!activeAccount) {
    return [];
  }

  const friends = await friendService.getSparkEnabled(activeAccount.id);
  const results: SparkResult[] = [];

  for (const friend of friends) {
    try {
      const result = await sendSparkMessage(friend.id);
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        friendId: friend.id,
        friendName: friend.nickname,
        status: 'failed',
        error: errorMessage,
        sentAt: new Date(),
      });
    }
  }

  return results;
}

/**
 * 获取火花日志
 */
export async function getSparkLogs(options: SparkLogQueryOptions): Promise<PaginatedResponse<SparkLog>> {
  const { page, pageSize, friendId } = options;

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

  const logs = await sparkLogService.getList({
    accountId: activeAccount.id,
    friendId,
    limit,
    offset,
  });

  // 转换为前端格式
  const items: SparkLog[] = logs.map(log => ({
    id: log.id,
    friendId: log.friendId,
    message: log.message,
    status: log.status as 'success' | 'failed',
    sentAt: log.sentAt,
  }));

  return {
    items,
    total: logs.length,
    page,
    pageSize,
    hasMore: offset + pageSize < logs.length,
  };
}
