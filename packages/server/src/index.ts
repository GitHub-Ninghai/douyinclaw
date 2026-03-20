/**
 * @douyinclaw/server - API 服务
 */

import app from './routes/index.js';

// 导出队列模块
export { QueueManager } from './queue/index.js';
export type {
  SparkJobData,
  SparkJobResult,
  ReplyJobData,
  ReplyJobResult,
  HeartbeatJobData,
  MessageCheckJobData,
  RedisConfig,
  QueueConfig,
  CronConfig,
  QueueStats,
  JobProcessor,
  QueueName,
} from './queue/types.js';

// 导出服务
export { getSystemStatus } from './services/status.js';
export { getLoginStatus, checkLogin, getQRCode, logout, getCurrentClient, setCurrentClient } from './services/login.js';
export { getFriendsList, getFriendById, updateFriend, updateFriendSparkSettings } from './services/friend.js';
export { sendSparkMessage, sendSparkToAll, getSparkLogs } from './services/spark.js';
export { getReplyLogs, getPendingReplies, approveReply, rejectReply, generateReply } from './services/reply.js';
export { getSettings, updateSettings, getAIProviders, resetSettings, getSetting } from './services/settings.js';
export { getLogs, clearLogs, addLog, logInfo, logWarn, logError } from './services/logs.js';
export { getMessagePool, addMessageToPool, updateMessageInPool, deleteMessageFromPool, getRandomMessage } from './services/message-pool.js';

// 导出 Hono 应用
export { app };

// 默认导出
export default app;
