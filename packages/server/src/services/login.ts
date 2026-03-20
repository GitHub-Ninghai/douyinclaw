/**
 * 登录服务
 */

import { BrowserClient, SessionManager, accountService } from '@douyinclaw/core';

// 存储当前会话管理器实例
let currentClient: BrowserClient | null = null;
let sessionManager: SessionManager | null = null;
let qrCodeData: { qrUrl: string; expireAt: Date } | null = null;

interface LoginStatusResult {
  status: 'logged_in' | 'waiting_scan' | 'not_logged_in';
  nickname?: string;
  qrCode?: string;
}

/**
 * 获取登录状态
 */
export async function getLoginStatus(): Promise<LoginStatusResult> {
  const activeAccount = await accountService.getActive();

  if (activeAccount && activeAccount.status === 'active') {
    return {
      status: 'logged_in',
      nickname: activeAccount.nickname,
    };
  }

  // 如果有二维码数据且未过期
  if (qrCodeData && qrCodeData.expireAt > new Date()) {
    return {
      status: 'waiting_scan',
      qrCode: qrCodeData.qrUrl,
    };
  }

  return {
    status: 'not_logged_in',
  };
}

/**
 * 获取登录二维码
 */
export async function getQRCode(): Promise<{ qrUrl: string; expireAt: string }> {
  // 清理旧客户端
  if (currentClient) {
    await currentClient.close();
    currentClient = null;
    sessionManager = null;
  }

  // 创建新客户端
  currentClient = new BrowserClient({
    headless: process.env.HEADLESS !== 'false',
    userDataDir: process.env.STORAGE_PATH || './data/browser',
  });

  await currentClient.initialize();

  // 创建会话管理器
  sessionManager = new SessionManager(currentClient);

  // 执行登录流程
  const result = await sessionManager.login();

  if (result.success && result.qrcodeImage) {
    // 将 Buffer 转换为 base64 data URL
    const qrUrl = typeof result.qrcodeImage === 'string'
      ? result.qrcodeImage
      : `data:image/png;base64,${result.qrcodeImage.toString('base64')}`;

    const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期
    qrCodeData = { qrUrl, expireAt };

    return {
      qrUrl,
      expireAt: expireAt.toISOString(),
    };
  }

  throw new Error(result.error || 'Failed to get QR code');
}

/**
 * 检查登录状态并完成登录
 */
export async function checkLogin(): Promise<{ success: boolean; nickname?: string; message?: string }> {
  if (!sessionManager) {
    return {
      success: false,
      message: 'Please get QR code first',
    };
  }

  // 检查是否已登录
  const isLoggedIn = await sessionManager.checkLoginStatus();

  if (!isLoggedIn) {
    return {
      success: false,
      message: 'Not logged in yet',
    };
  }

  // 创建或更新账号
  const existingAccount = await accountService.getActive();
  let account;

  if (existingAccount) {
    account = await accountService.updateStatus(existingAccount.id, 'active');
    await accountService.updateLastLogin(existingAccount.id);
  } else {
    account = await accountService.create({
      nickname: 'DouyinUser',
      storagePath: process.env.STORAGE_PATH || './data/browser',
      status: 'active',
    });
  }

  // 清理二维码数据
  qrCodeData = null;

  return {
    success: true,
    nickname: account?.nickname,
    message: 'Login successful',
  };
}

/**
 * 登出
 */
export async function logout(): Promise<{ success: boolean; message: string }> {
  // 关闭客户端
  if (currentClient) {
    await currentClient.close();
    currentClient = null;
    sessionManager = null;
  }

  // 更新账号状态
  const activeAccount = await accountService.getActive();
  if (activeAccount) {
    await accountService.updateStatus(activeAccount.id, 'inactive');
  }

  qrCodeData = null;

  return {
    success: true,
    message: 'Logged out successfully',
  };
}

/**
 * 获取当前客户端实例
 */
export function getCurrentClient(): BrowserClient | null {
  return currentClient;
}

/**
 * 获取当前会话管理器实例
 */
export function getSessionManager(): SessionManager | null {
  return sessionManager;
}

/**
 * 设置当前客户端实例
 */
export function setCurrentClient(client: BrowserClient | null): void {
  currentClient = client;
  if (client) {
    sessionManager = new SessionManager(client);
  } else {
    sessionManager = null;
  }
}
