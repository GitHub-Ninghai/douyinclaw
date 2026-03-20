/**
 * 回复相关路由
 */

import { Hono } from 'hono';
import {
  getReplyLogs,
  getPendingReplies,
  approveReply,
  rejectReply,
  generateReply,
} from '../services/reply.js';

const app = new Hono();

/**
 * GET /api/reply/logs - 获取回复日志
 */
app.get('/logs', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);
    const status = c.req.query('status') as 'pending' | 'sent' | 'rejected' | undefined;

    const result = await getReplyLogs({ page, pageSize, status });
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * GET /api/reply/pending - 获取待审批的回复
 */
app.get('/pending', async (c) => {
  try {
    const result = await getPendingReplies();
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * POST /api/reply/generate - 生成回复
 */
app.post('/generate', async (c) => {
  try {
    const body = await c.req.json<{
      friendId: string;
      videoUrl?: string;
      videoTitle?: string;
      originalMessage?: string;
    }>();

    if (!body.friendId) {
      return c.json({ success: false, error: 'friendId is required' }, 400);
    }

    const result = await generateReply(body);
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * POST /api/reply/:id/approve - 批准回复
 */
app.post('/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await approveReply(id);
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * POST /api/reply/:id/reject - 拒绝回复
 */
app.post('/:id/reject', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await rejectReply(id);
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;
