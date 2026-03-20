/**
 * 会话管理模块
 * 处理登录、会话持久化和状态检测
 */

import { Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { BrowserClient } from './client.js';
import { douyinSelectors, getAllSelectors } from './selectors.js';

const LOG_PREFIX = '[Browser]';

/**
 * 会话管理配置
 */
export interface SessionConfig {
  /** 会话存储目录 */
  sessionDir: string;

  /** AES 加密密钥（32 字节） */
  encryptionKey?: string;

  /** 登录超时时间 (ms) */
  loginTimeout: number;

  /** 心跳检测间隔 (ms) */
  heartbeatInterval: number;
}

const defaultSessionConfig: SessionConfig = {
  sessionDir: './sessions',
  loginTimeout: 120000, // 2 分钟
  heartbeatInterval: 60000, // 1 分钟
};

/**
 * 会话数据
 */
export interface SessionData {
  cookies: unknown[];
  localStorage: Record<string, string>;
  sessionStorage?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/**
 * 登录结果
 */
export interface LoginResult {
  success: boolean;
  qrcodeImage?: Buffer;
  error?: string;
}

/**
 * 会话状态
 */
export interface SessionStatus {
  isLoggedIn: boolean;
  lastChecked: Date;
  expiresAt?: Date;
}

/**
 * 好友信息
 */
export interface FriendInfo {
  /** 好友 ID */
  id: string;
  /** 好友昵称 */
  name: string;
  /** 好友头像 URL */
  avatar?: string;
  /** 火花天数 */
  sparkDays?: number;
  /** 是否有未读消息 */
  hasUnread?: boolean;
  /** 未读消息数 */
  unreadCount?: number;
}

/**
 * 发送消息结果
 */
export interface SendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * 会话管理器类
 */
export class SessionManager {
  private client: BrowserClient;
  private config: SessionConfig;
  private sessionFile: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(client: BrowserClient, config: Partial<SessionConfig> = {}) {
    this.client = client;
    this.config = { ...defaultSessionConfig, ...config };
    this.sessionFile = path.join(this.config.sessionDir, 'session.enc');
  }

  /**
   * 执行登录流程
   * 打开抖音并返回二维码图片供用户扫码
   */
  async login(): Promise<LoginResult> {
    console.log(`${LOG_PREFIX} 开始登录流程...`);

    try {
      // 确保浏览器已初始化
      if (!this.client.isReady()) {
        await this.client.initialize();
      }

      const page = this.client.getPage();

      // 导航到抖音首页
      await this.client.navigate('https://www.douyin.com');

      // 等待页面加载
      await page.waitForLoadState('networkidle');

      // 检查是否已登录
      if (await this.checkLoginStatus()) {
        console.log(`${LOG_PREFIX} 已经登录`);
        return { success: true };
      }

      // 尝试找到并点击登录按钮
      await this.clickLoginButton(page);

      // 等待二维码出现
      const qrcodeImage = await this.captureQrcode(page);

      if (!qrcodeImage) {
        return {
          success: false,
          error: '无法获取登录二维码',
        };
      }

      // 等待用户扫码登录
      const loginSuccess = await this.waitForLogin(page, this.config.loginTimeout);

      if (loginSuccess) {
        // 保存会话
        await this.saveSession();
        console.log(`${LOG_PREFIX} 登录成功`);

        return { success: true, qrcodeImage };
      } else {
        return {
          success: false,
          error: '登录超时',
          qrcodeImage,
        };
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 登录失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 点击登录按钮
   */
  private async clickLoginButton(page: Page): Promise<void> {
    try {
      // 尝试多种登录按钮选择器
      const loginSelectors = [
        'button:has-text("登录")',
        'div[class*="login"] button',
        'a[href*="login"]',
        '[class*="header"] [class*="login"]',
      ];

      for (const selector of loginSelectors) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 3000 });
          if (element) {
            await element.click();
            await page.waitForTimeout(1000);
            console.log(`${LOG_PREFIX} 已点击登录按钮`);
            return;
          }
        } catch {
          continue;
        }
      }

      console.log(`${LOG_PREFIX} 未找到登录按钮，可能已在登录页面`);
    } catch (error) {
      console.log(`${LOG_PREFIX} 点击登录按钮时出错:`, error);
    }
  }

  /**
   * 捕获二维码图片
   */
  private async captureQrcode(page: Page): Promise<Buffer | null> {
    try {
      const qrcodeConfig = douyinSelectors.login.qrcode;
      const selectors = getAllSelectors(qrcodeConfig);

      for (const selector of selectors) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 5000 });
          if (element) {
            // 等待二维码加载完成
            await page.waitForTimeout(2000);

            // 截取二维码图片
            const screenshot = await element.screenshot();
            console.log(`${LOG_PREFIX} 已捕获二维码图片`);
            return screenshot;
          }
        } catch {
          continue;
        }
      }

      // 如果无法找到二维码元素，尝试截取整个登录区域
      const containerConfig = douyinSelectors.login.qrcodeContainer;
      const containerSelectors = getAllSelectors(containerConfig);

      for (const selector of containerSelectors) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 3000 });
          if (element) {
            await page.waitForTimeout(2000);
            const screenshot = await element.screenshot();
            console.log(`${LOG_PREFIX} 已捕获登录区域截图`);
            return screenshot;
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error(`${LOG_PREFIX} 捕获二维码失败:`, error);
      return null;
    }
  }

  /**
   * 等待登录完成
   */
  private async waitForLogin(page: Page, timeout: number): Promise<boolean> {
    console.log(`${LOG_PREFIX} 等待用户扫码登录...`);

    try {
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        // 检查是否登录成功
        if (await this.checkLoginStatus()) {
          return true;
        }

        // 检查二维码是否过期或刷新
        const qrcodeExpired = await page.evaluate(() => {
          const expiredEl = document.querySelector('[class*="expired"], [class*="timeout"]');
          return expiredEl !== null;
        });

        if (qrcodeExpired) {
          console.log(`${LOG_PREFIX} 二维码已过期，尝试刷新...`);
          await page.reload();
          await page.waitForTimeout(2000);
        }

        await page.waitForTimeout(2000);
      }

      return false;
    } catch (error) {
      console.error(`${LOG_PREFIX} 等待登录时出错:`, error);
      return false;
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(): Promise<boolean> {
    try {
      const page = this.client.getPage();

      // 尝试多种方式检测登录状态
      const userConfig = douyinSelectors.login.loginSuccess;
      const selectors = getAllSelectors(userConfig);

      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            // 检查元素是否可见且包含用户头像等信息
            const isVisible = await element.isVisible();
            if (isVisible) {
              console.log(`${LOG_PREFIX} 检测到已登录状态`);
              return true;
            }
          }
        } catch {
          continue;
        }
      }

      // 备选方案：检查页面中是否有用户昵称等元素
      const hasUserInfo = await page.evaluate(() => {
        // 检查是否有用户头像图片
        const avatarImg = document.querySelector('img[class*="avatar"]');
        if (avatarImg) return true;

        // 检查是否有退出登录按钮
        const logoutBtn = document.querySelector('[class*="logout"], button:has-text("退出")');
        if (logoutBtn) return true;

        return false;
      });

      return hasUserInfo;
    } catch (error) {
      console.error(`${LOG_PREFIX} 检查登录状态失败:`, error);
      return false;
    }
  }

  /**
   * 保存会话到文件
   */
  async saveSession(): Promise<void> {
    try {
      const context = this.client.getContext();

      // 获取 cookies
      const cookies = await context.cookies();

      // 获取 localStorage
      const page = this.client.getPage();
      const localStorage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items[key] = window.localStorage.getItem(key) || '';
          }
        }
        return items;
      });

      // 获取 sessionStorage
      const sessionStorage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            items[key] = window.sessionStorage.getItem(key) || '';
          }
        }
        return items;
      });

      const sessionData: SessionData = {
        cookies,
        localStorage,
        sessionStorage,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 确保目录存在
      const sessionDir = path.dirname(this.sessionFile);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // 加密并保存
      const encryptedData = this.encryptData(JSON.stringify(sessionData));
      fs.writeFileSync(this.sessionFile, encryptedData);

      console.log(`${LOG_PREFIX} 会话已保存`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 保存会话失败:`, error);
      throw error;
    }
  }

  /**
   * 从文件加载会话
   */
  async loadSession(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.sessionFile)) {
        console.log(`${LOG_PREFIX} 会话文件不存在`);
        return false;
      }

      // 读取并解密
      const encryptedData = fs.readFileSync(this.sessionFile);
      const decryptedData = this.decryptData(encryptedData);
      const sessionData: SessionData = JSON.parse(decryptedData);

      // 确保浏览器已初始化
      if (!this.client.isReady()) {
        await this.client.initialize();
      }

      const context = this.client.getContext();

      // 恢复 cookies
      if (sessionData.cookies.length > 0) {
        await context.addCookies(sessionData.cookies as Parameters<BrowserContext['addCookies']>[0]);
      }

      // 恢复 localStorage
      const page = this.client.getPage();
      await page.evaluate((storage) => {
        for (const [key, value] of Object.entries(storage)) {
          window.localStorage.setItem(key, value);
        }
      }, sessionData.localStorage);

      console.log(`${LOG_PREFIX} 会话已加载`);
      return true;
    } catch (error) {
      console.error(`${LOG_PREFIX} 加载会话失败:`, error);
      return false;
    }
  }

  /**
   * 检查会话是否有效
   */
  async checkSession(): Promise<SessionStatus> {
    try {
      // 尝试加载会话
      const loaded = await this.loadSession();

      if (!loaded) {
        return {
          isLoggedIn: false,
          lastChecked: new Date(),
        };
      }

      // 导航到抖音并检查登录状态
      await this.client.navigate('https://www.douyin.com');
      const isLoggedIn = await this.checkLoginStatus();

      return {
        isLoggedIn,
        lastChecked: new Date(),
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} 检查会话失败:`, error);
      return {
        isLoggedIn: false,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat(callback?: (status: SessionStatus) => void): void {
    console.log(`${LOG_PREFIX} 启动会话心跳检测`);

    this.heartbeatTimer = setInterval(async () => {
      try {
        const status = await this.checkSession();
        callback?.(status);

        if (!status.isLoggedIn) {
          console.log(`${LOG_PREFIX} 会话已失效`);
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} 心跳检测失败:`, error);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳检测
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log(`${LOG_PREFIX} 已停止会话心跳检测`);
    }
  }

  /**
   * 加密数据
   */
  private encryptData(data: string): Buffer {
    if (!this.config.encryptionKey) {
      // 未设置加密密钥，直接返回原始数据
      return Buffer.from(data, 'utf-8');
    }

    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf-8'),
      cipher.final(),
    ]);

    // 将 IV 附加到加密数据前面
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * 解密数据
   */
  private decryptData(encryptedData: Buffer): string {
    if (!this.config.encryptionKey) {
      // 未设置加密密钥，直接返回原始数据
      return encryptedData.toString('utf-8');
    }

    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);

    // 提取 IV
    const iv = encryptedData.subarray(0, 16);
    const encrypted = encryptedData.subarray(16);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf-8');
  }

  /**
   * 清除会话
   */
  async clearSession(): Promise<void> {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
      }

      // 清除浏览器数据
      const context = this.client.getContext();
      await context.clearCookies();

      const page = this.client.getPage();
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      console.log(`${LOG_PREFIX} 会话已清除`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 清除会话失败:`, error);
    }
  }

  /**
   * 打开消息面板
   */
  async openMessagePanel(): Promise<boolean> {
    try {
      const page = this.client.getPage();

      // 检查消息面板是否已打开
      const panelConfig = douyinSelectors.message.messagePanel;
      const panelSelectors = getAllSelectors(panelConfig);

      for (const selector of panelSelectors) {
        const panel = await page.$(selector);
        if (panel) {
          const isVisible = await panel.isVisible();
          if (isVisible) {
            console.log(`${LOG_PREFIX} 消息面板已打开`);
            return true;
          }
        }
      }

      // 点击消息图标打开面板
      const iconConfig = douyinSelectors.message.messageIcon;
      const iconSelectors = getAllSelectors(iconConfig);

      for (const selector of iconSelectors) {
        try {
          const icon = await page.waitForSelector(selector, { timeout: 3000 });
          if (icon) {
            await icon.click();
            await page.waitForTimeout(1500);
            console.log(`${LOG_PREFIX} 已点击消息图标`);
            return true;
          }
        } catch {
          continue;
        }
      }

      console.log(`${LOG_PREFIX} 无法打开消息面板`);
      return false;
    } catch (error) {
      console.error(`${LOG_PREFIX} 打开消息面板失败:`, error);
      return false;
    }
  }

  /**
   * 获取好友列表
   */
  async getFriendList(): Promise<FriendInfo[]> {
    console.log(`${LOG_PREFIX} 正在获取好友列表...`);

    try {
      // 确保消息面板已打开
      await this.openMessagePanel();

      const page = this.client.getPage();
      const friends: FriendInfo[] = [];

      // 等待会话列表加载
      const listConfig = douyinSelectors.message.conversationList;
      const listSelectors = getAllSelectors(listConfig);

      let listElement: import('playwright').ElementHandle | null = null;
      for (const selector of listSelectors) {
        try {
          listElement = await page.waitForSelector(selector, { timeout: 5000 });
          if (listElement) break;
        } catch {
          continue;
        }
      }

      if (!listElement) {
        console.log(`${LOG_PREFIX} 未找到会话列表`);
        return friends;
      }

      // 获取所有会话项
      const itemConfig = douyinSelectors.message.conversationItem;
      const itemSelectors = getAllSelectors(itemConfig);

      let items: import('playwright').ElementHandle[] = [];
      for (const selector of itemSelectors) {
        try {
          items = await page.$$(selector);
          if (items.length > 0) break;
        } catch {
          continue;
        }
      }

      console.log(`${LOG_PREFIX} 找到 ${items.length} 个会话`);

      // 解析每个会话项
      for (const item of items) {
        try {
          const friend = await this.parseConversationItem(item, page);
          if (friend) {
            friends.push(friend);
          }
        } catch {
          // 忽略单个解析错误
        }
      }

      console.log(`${LOG_PREFIX} 成功获取 ${friends.length} 个好友`);
      return friends;
    } catch (error) {
      console.error(`${LOG_PREFIX} 获取好友列表失败:`, error);
      return [];
    }
  }

  /**
   * 解析单个会话项
   */
  private async parseConversationItem(
    item: import('playwright').ElementHandle,
    _page: Page
  ): Promise<FriendInfo | null> {
    try {
      // 尝试获取好友名称
      const nameConfig = douyinSelectors.spark.friendName;
      const nameSelectors = getAllSelectors(nameConfig);

      let name = '';
      for (const selector of nameSelectors) {
        try {
          const nameEl = await item.$(selector);
          if (nameEl) {
            name = (await nameEl.textContent()) || '';
            if (name) break;
          }
        } catch {
          continue;
        }
      }

      // 如果没有找到名称，尝试从整个元素获取文本
      if (!name) {
        name = (await item.textContent()) || '';
        // 清理名称，去除多余空白
        name = name.trim().split('\n')[0] || '';
      }

      if (!name) {
        return null;
      }

      // 生成唯一 ID（基于名称的 hash）
      const id = crypto.createHash('md5').update(name).digest('hex').substring(0, 16);

      // 获取未读消息数
      let unreadCount = 0;
      const badgeConfig = douyinSelectors.message.unreadBadge;
      const badgeSelectors = getAllSelectors(badgeConfig);

      for (const selector of badgeSelectors) {
        try {
          const badge = await item.$(selector);
          if (badge) {
            const badgeText = (await badge.textContent()) || '';
            const count = parseInt(badgeText, 10);
            if (!isNaN(count)) {
              unreadCount = count;
              break;
            }
          }
        } catch {
          continue;
        }
      }

      // 检查是否有火花图标
      let sparkDays: number | undefined;
      const sparkConfig = douyinSelectors.spark.sparkDays;
      const sparkSelectors = getAllSelectors(sparkConfig);

      for (const selector of sparkSelectors) {
        try {
          const sparkEl = await item.$(selector);
          if (sparkEl) {
            const sparkText = (await sparkEl.textContent()) || '';
            const daysMatch = sparkText.match(/(\d+)/);
            if (daysMatch) {
              sparkDays = parseInt(daysMatch[1]!, 10);
              break;
            }
          }
        } catch {
          continue;
        }
      }

      return {
        id,
        name: name.trim(),
        sparkDays,
        hasUnread: unreadCount > 0,
        unreadCount,
      };
    } catch {
      return null;
    }
  }

  /**
   * 打开与指定好友的聊天窗口
   * @param friendName 好友名称
   */
  async openChatWithFriend(friendName: string): Promise<boolean> {
    console.log(`${LOG_PREFIX} 正在打开与 ${friendName} 的聊天...`);

    try {
      // 确保消息面板已打开
      await this.openMessagePanel();

      const page = this.client.getPage();

      // 尝试通过 XPath 查找会话
      const xpath = `//div[contains(@class, "conversation") or contains(@class, "chat") or contains(@class, "session")][contains(., "${friendName}")]`;

      try {
        const item = await page.waitForSelector(`xpath=${xpath}`, { timeout: 5000 });
        if (item) {
          await item.click();
          await page.waitForTimeout(1000);
          console.log(`${LOG_PREFIX} 已打开与 ${friendName} 的聊天`);
          return true;
        }
      } catch {
        // XPath 失败，尝试遍历会话列表
      }

      // 备选方案：遍历所有会话项
      const itemConfig = douyinSelectors.message.conversationItem;
      const itemSelectors = getAllSelectors(itemConfig);

      for (const selector of itemSelectors) {
        try {
          const items = await page.$$(selector);
          for (const item of items) {
            const text = (await item.textContent()) || '';
            if (text.includes(friendName)) {
              await item.click();
              await page.waitForTimeout(1000);
              console.log(`${LOG_PREFIX} 已打开与 ${friendName} 的聊天`);
              return true;
            }
          }
        } catch {
          continue;
        }
      }

      console.log(`${LOG_PREFIX} 未找到好友 ${friendName}`);
      return false;
    } catch (error) {
      console.error(`${LOG_PREFIX} 打开聊天窗口失败:`, error);
      return false;
    }
  }

  /**
   * 发送消息给指定好友
   * @param friendName 好友名称
   * @param message 消息内容
   */
  async sendMessage(friendName: string, message: string): Promise<SendMessageResult> {
    console.log(`${LOG_PREFIX} 正在发送消息给 ${friendName}...`);

    try {
      // 打开聊天窗口
      const opened = await this.openChatWithFriend(friendName);
      if (!opened) {
        return {
          success: false,
          error: `无法打开与 ${friendName} 的聊天窗口`,
        };
      }

      const page = this.client.getPage();

      // 等待聊天输入框出现
      const inputConfig = douyinSelectors.message.chatInput;
      const inputSelectors = getAllSelectors(inputConfig);

      let inputFound = false;
      for (const selector of inputSelectors) {
        try {
          const input = await page.waitForSelector(selector, { timeout: 5000 });
          if (input) {
            // 聚焦并输入消息
            await input.click();
            await page.waitForTimeout(300);

            // 使用安全输入方式
            await this.client.safeType(selector, message);
            inputFound = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!inputFound) {
        return {
          success: false,
          error: '无法找到聊天输入框',
        };
      }

      // 等待一下再点击发送
      await page.waitForTimeout(500);

      // 点击发送按钮
      const sendConfig = douyinSelectors.message.sendButton;
      const sendSelectors = getAllSelectors(sendConfig);

      let sent = false;
      for (const selector of sendSelectors) {
        try {
          const sendBtn = await page.$(selector);
          if (sendBtn) {
            const isEnabled = await sendBtn.isEnabled();
            if (isEnabled) {
              await sendBtn.click();
              sent = true;
              break;
            }
          }
        } catch {
          continue;
        }
      }

      // 如果找不到发送按钮，尝试按回车键
      if (!sent) {
        await page.keyboard.press('Enter');
        sent = true;
      }

      if (sent) {
        await page.waitForTimeout(500);
        console.log(`${LOG_PREFIX} 消息已发送给 ${friendName}`);
        return { success: true };
      } else {
        return {
          success: false,
          error: '无法发送消息',
        };
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 发送消息失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 获取当前聊天窗口中的消息
   */
  async getChatMessages(): Promise<Array<{ content: string; isSelf: boolean; timestamp?: Date }>> {
    try {
      const page = this.client.getPage();
      const messages: Array<{ content: string; isSelf: boolean; timestamp?: Date }> = [];

      // 获取消息项
      const itemConfig = douyinSelectors.message.messageItem;
      const itemSelectors = getAllSelectors(itemConfig);

      for (const selector of itemSelectors) {
        try {
          const items = await page.$$(selector);
          for (const item of items) {
            const content = (await item.textContent()) || '';
            // 判断是否是自己发送的消息（通常自己的消息在右侧）
            const className = (await item.getAttribute('class')) || '';
            const isSelf = className.includes('self') || className.includes('right') || className.includes('sent');

            messages.push({
              content: content.trim(),
              isSelf,
            });
          }
          if (messages.length > 0) break;
        } catch {
          continue;
        }
      }

      return messages;
    } catch (error) {
      console.error(`${LOG_PREFIX} 获取聊天消息失败:`, error);
      return [];
    }
  }
}

/**
 * 创建会话管理器实例
 */
export function createSessionManager(
  client: BrowserClient,
  config?: Partial<SessionConfig>
): SessionManager {
  return new SessionManager(client, config);
}
