/**
 * 消息池相关路由
 */

import { Hono } from 'hono';
import {
  getMessagePool,
  addMessageToPool,
  updateMessageInPool,
  deleteMessageFromPool,
  getRandomMessage,
} from '../services/message-pool.js';
import type { MessagePoolItem } from '@douyinclaw/shared';

const app = new Hono();

/**
 * GET /api/message-pool - 获取消息池
 */
app.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);
    const category = c.req.query('category') as 'spark' | 'greeting' | 'reply' | undefined;

    const result = await getMessagePool({ page, pageSize, category });
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * POST /api/message-pool - 添加消息到池中
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      content: string;
      category: 'spark' | 'greeting' | 'reply';
    }>();

    if (!body.content || !body.category) {
      return c.json({ success: false, error: 'content and category are required' }, 400);
    }

    const message = await addMessageToPool(body.content, body.category);
    return c.json({ success: true, data: message });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * GET /api/message-pool/random - 获取随机消息
 */
app.get('/random', async (c) => {
  try {
    const category = c.req.query('category') as 'spark' | 'greeting' | 'reply' | undefined;
    const message = await getRandomMessage(category);

    if (!message) {
      return c.json({ success: false, error: 'No messages available' }, 404);
    }

    return c.json({ success: true, data: message });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * PUT /api/message-pool/:id - 更新消息
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<Partial<MessagePoolItem>>();

    const message = await updateMessageInPool(id, body);
    return c.json({ success: true, data: message });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * DELETE /api/message-pool/:id - 删除消息
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await deleteMessageFromPool(id);
    return c.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;
