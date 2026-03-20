/**
 * 系统状态服务
 */

import type { SystemStatus, AccountStatus } from '@douyinclaw/shared';
import { accountService, sparkLogService, replyLogService } from '@douyinclaw/core';

// 服务启动时间
const startTime = Date.now();

/**
 * 获取系统状态
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  // 获取活跃账号
  const activeAccount = await accountService.getActive();

  // 获取今日火花统计
  let todaySpark = { success: 0, failed: 0, total: 0 };
  let todayReplies = 0;

  if (activeAccount) {
    todaySpark = await sparkLogService.getTodayStats(activeAccount.id);
    todayReplies = await replyLogService.getTodayCount(activeAccount.id);
  }

  // 计算下次火花时间
  const now = new Date();
  let nextSparkTime: Date | undefined;

  const hours = now.getHours();
  const minutes = now.getMinutes();

  // 火花时间: 8:00 和 20:00
  if (hours < 8 || (hours === 8 && minutes === 0)) {
    nextSparkTime = new Date(now);
    nextSparkTime.setHours(8, 0, 0, 0);
  } else if (hours < 20) {
    nextSparkTime = new Date(now);
    nextSparkTime.setHours(20, 0, 0, 0);
  } else {
    nextSparkTime = new Date(now);
    nextSparkTime.setDate(nextSparkTime.getDate() + 1);
    nextSparkTime.setHours(8, 0, 0, 0);
  }

  const status: SystemStatus = {
    loginStatus: (activeAccount?.status ?? 'inactive') as AccountStatus,
    todaySpark,
    todayReplies,
    nextSparkTime,
    uptime: Date.now() - startTime,
  };

  return status;
}
