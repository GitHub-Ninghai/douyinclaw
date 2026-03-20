/**
 * 火花相关路由
 */

import { Hono } from 'hono';
import {
  sendSparkMessage,
  getSparkLogs,
  sendSparkToAll,
} from '../services/spark.js';

const app = new Hono();

/**
 * POST /api/spark/send - 发送火花消息
 */
app.post('/send', async (c) => {
  try {
    const body = await c.req.json<{
      friendId: string;
      message?: string;
    }>();

    if (!body.friendId) {
      return c.json({ success: false, error: 'friendId is required' }, 400);
    }

    const result = await sendSparkMessage(body.friendId, body.message);
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * POST /api/spark/send-all - 向所有启用火花的好友发送
 */
app.post('/send-all', async (c) => {
  try {
    const results = await sendSparkToAll();
    return c.json({ success: true, data: results });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * GET /api/spark/logs - 获取火花日志
 */
app.get('/logs', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);
    const friendId = c.req.query('friendId');

    const result = await getSparkLogs({ page, pageSize, friendId });
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;
