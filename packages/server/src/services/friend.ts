/**
 * 好友服务
 */

import type { Friend, PaginatedResponse } from '@douyinclaw/shared';
import { friendService, accountService } from '@douyinclaw/core';

interface GetFriendsOptions {
  page: number;
  pageSize: number;
  search?: string;
}

/**
 * 获取好友列表
 */
export async function getFriendsList(options: GetFriendsOptions): Promise<PaginatedResponse<Friend>> {
  const { page, pageSize, search } = options;

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

  let friends = await friendService.getByAccountId(activeAccount.id);

  // 搜索过滤
  if (search) {
    const searchLower = search.toLowerCase();
    friends = friends.filter(f => f.nickname.toLowerCase().includes(searchLower));
  }

  // 转换为前端需要的格式
  const items: Friend[] = friends.map(f => ({
    id: f.id,
    accountId: f.accountId,
    nickname: f.nickname,
    sparkDays: f.sparkDays,
    isSparkEnabled: f.isSparkEnabled,
    replyStyle: {
      tone: f.replyStyle as 'casual' | 'humorous' | 'analytical' | 'brief',
      persona: f.replyPersona ?? undefined,
      maxLength: f.replyMaxLength ?? undefined,
    },
    lastInteraction: f.lastInteractionAt ?? undefined,
    createdAt: f.createdAt,
  }));

  // 分页
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = items.slice(start, end);

  return {
    items: paginatedItems,
    total: items.length,
    page,
    pageSize,
    hasMore: end < items.length,
  };
}

/**
 * 根据 ID 获取好友
 */
export async function getFriendById(id: string): Promise<Friend | null> {
  const friend = await friendService.getById(id);

  if (!friend) {
    return null;
  }

  return {
    id: friend.id,
    accountId: friend.accountId,
    nickname: friend.nickname,
    sparkDays: friend.sparkDays,
    isSparkEnabled: friend.isSparkEnabled,
    replyStyle: {
      tone: friend.replyStyle as 'casual' | 'humorous' | 'analytical' | 'brief',
      persona: friend.replyPersona ?? undefined,
      maxLength: friend.replyMaxLength ?? undefined,
    },
    lastInteraction: friend.lastInteractionAt ?? undefined,
    createdAt: friend.createdAt,
  };
}

/**
 * 更新好友信息
 */
export async function updateFriend(id: string, data: Partial<Friend>): Promise<Friend | null> {
  const updateData: Record<string, unknown> = {};

  if (data.nickname !== undefined) {
    updateData.nickname = data.nickname;
  }
  if (data.sparkDays !== undefined) {
    updateData.sparkDays = data.sparkDays;
  }
  if (data.isSparkEnabled !== undefined) {
    updateData.isSparkEnabled = data.isSparkEnabled;
  }
  if (data.replyStyle !== undefined) {
    updateData.replyStyle = data.replyStyle.tone;
    updateData.replyPersona = data.replyStyle.persona;
    updateData.replyMaxLength = data.replyStyle.maxLength;
  }

  const friend = await friendService.update(id, updateData);

  if (!friend) {
    return null;
  }

  return {
    id: friend.id,
    accountId: friend.accountId,
    nickname: friend.nickname,
    sparkDays: friend.sparkDays,
    isSparkEnabled: friend.isSparkEnabled,
    replyStyle: {
      tone: friend.replyStyle as 'casual' | 'humorous' | 'analytical' | 'brief',
      persona: friend.replyPersona ?? undefined,
      maxLength: friend.replyMaxLength ?? undefined,
    },
    lastInteraction: friend.lastInteractionAt ?? undefined,
    createdAt: friend.createdAt,
  };
}

/**
 * 更新好友火花设置
 */
export async function updateFriendSparkSettings(
  id: string,
  data: { isSparkEnabled?: boolean; sparkDays?: number }
): Promise<Friend | null> {
  const updateData: Record<string, unknown> = {};

  if (data.isSparkEnabled !== undefined) {
    updateData.isSparkEnabled = data.isSparkEnabled;
  }
  if (data.sparkDays !== undefined) {
    updateData.sparkDays = data.sparkDays;
    updateData.lastInteractionAt = new Date();
  }

  const friend = await friendService.update(id, updateData);

  if (!friend) {
    return null;
  }

  return {
    id: friend.id,
    accountId: friend.accountId,
    nickname: friend.nickname,
    sparkDays: friend.sparkDays,
    isSparkEnabled: friend.isSparkEnabled,
    replyStyle: {
      tone: friend.replyStyle as 'casual' | 'humorous' | 'analytical' | 'brief',
      persona: friend.replyPersona ?? undefined,
      maxLength: friend.replyMaxLength ?? undefined,
    },
    lastInteraction: friend.lastInteractionAt ?? undefined,
    createdAt: friend.createdAt,
  };
}
