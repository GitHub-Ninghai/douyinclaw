/**
 * 好友管理路由
 */

import { Hono } from 'hono';
import {
  getFriendsList,
  getFriendById,
  updateFriend,
  updateFriendSparkSettings,
} from '../services/friend.js';
import type { Friend, ReplyStyle } from '@douyinclaw/shared';

const app = new Hono();

/**
 * GET /api/friends - 获取好友列表
 */
app.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);
    const search = c.req.query('search');

    const result = await getFriendsList({ page, pageSize, search });
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * GET /api/friends/:id - 获取单个好友
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const friend = await getFriendById(id);

    if (!friend) {
      return c.json({ success: false, error: 'Friend not found' }, 404);
    }

    return c.json({ success: true, data: friend });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * PUT /api/friends/:id - 更新好友信息
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<Partial<Friend>>();

    const friend = await updateFriend(id, body);
    return c.json({ success: true, data: friend });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * PUT /api/friends/:id/spark - 更新好友火花设置
 */
app.put('/:id/spark', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<{
      isSparkEnabled?: boolean;
      sparkDays?: number;
    }>();

    const friend = await updateFriendSparkSettings(id, body);
    return c.json({ success: true, data: friend });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * PUT /api/friends/:id/reply-style - 更新好友回复风格
 */
app.put('/:id/reply-style', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<ReplyStyle>();

    const friend = await updateFriend(id, { replyStyle: body });
    return c.json({ success: true, data: friend });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;
