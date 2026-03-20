/**
 * 视频解析器模块
 * 解析视频分享消息，提取视频信息
 */

import type { ElementHandle } from 'playwright';
import type { VideoInfo } from '@douyinclaw/shared';
import { BrowserClient } from '../browser/client.js';
import { douyinSelectors, getAllSelectors } from '../browser/selectors.js';

const LOG_PREFIX = '[VideoParser]';

/**
 * 视频解析配置
 */
export interface VideoParserConfig {
  /** 等待视频加载超时 (ms) */
  loadTimeout: number;

  /** 截图帧数 */
  screenshotFrames: number;

  /** 截图间隔 (ms) */
  screenshotInterval: number;
}

const defaultParserConfig: VideoParserConfig = {
  loadTimeout: 15000,
  screenshotFrames: 3,
  screenshotInterval: 1000,
};

/**
 * 解析结果
 */
export interface ParseResult {
  videoInfo: VideoInfo;
  screenshots: Buffer[];
}

/**
 * 视频解析器类
 */
export class VideoParser {
  private client: BrowserClient;
  private config: VideoParserConfig;

  constructor(client: BrowserClient, config: Partial<VideoParserConfig> = {}) {
    this.client = client;
    this.config = { ...defaultParserConfig, ...config };
  }

  /**
   * 从视频分享卡片解析视频信息
   * @param cardElement 视频分享卡片元素
   */
  async parseFromCard(cardElement: ElementHandle): Promise<ParseResult | null> {
    console.log(`${LOG_PREFIX} 从分享卡片解析视频...`);

    try {
      // 点击卡片进入视频页面
      await cardElement.click();

      const page = this.client.getPage();
      await page.waitForTimeout(2000);

      // 等待视频页面加载
      await this.waitForVideoPage();

      // 解析视频信息
      const videoInfo = await this.extractVideoInfo();

      // 截取视频截图
      const screenshots = await this.captureVideoScreenshots();

      // 返回上一页
      await page.goBack();
      await page.waitForTimeout(1000);

      return {
        videoInfo,
        screenshots,
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} 解析视频卡片失败:`, error);

      // 尝试返回上一页
      try {
        const page = this.client.getPage();
        await page.goBack();
      } catch {
        // 忽略
      }

      return null;
    }
  }

  /**
   * 从当前视频页面解析视频信息
   */
  async parseCurrentVideo(): Promise<ParseResult | null> {
    console.log(`${LOG_PREFIX} 解析当前视频页面...`);

    try {
      // 检查是否在视频页面
      const isVideoPage = await this.isVideoPage();
      if (!isVideoPage) {
        console.log(`${LOG_PREFIX} 当前不在视频页面`);
        return null;
      }

      // 解析视频信息
      const videoInfo = await this.extractVideoInfo();

      // 截取视频截图
      const screenshots = await this.captureVideoScreenshots();

      return {
        videoInfo,
        screenshots,
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} 解析当前视频失败:`, error);
      return null;
    }
  }

  /**
   * 等待视频页面加载
   */
  private async waitForVideoPage(): Promise<void> {
    const page = this.client.getPage();

    try {
      // 等待视频元素出现
      const videoConfig = douyinSelectors.video.videoPlayer;
      const selectors = getAllSelectors(videoConfig);

      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: this.config.loadTimeout });
          return;
        } catch {
          continue;
        }
      }

      // 备选方案：等待 URL 变化
      await page.waitForTimeout(3000);
    } catch (error) {
      console.error(`${LOG_PREFIX} 等待视频页面超时`);
      throw error;
    }
  }

  /**
   * 检查是否在视频页面
   */
  private async isVideoPage(): Promise<boolean> {
    const page = this.client.getPage();

    try {
      const videoConfig = douyinSelectors.video.videoPlayer;
      const selectors = getAllSelectors(videoConfig);

      for (const selector of selectors) {
        try {
          const video = await page.$(selector);
          if (video) {
            return true;
          }
        } catch {
          continue;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 提取视频信息
   */
  private async extractVideoInfo(): Promise<VideoInfo> {
    const page = this.client.getPage();

    try {
      // 使用 evaluate 在页面上下文中提取信息
      const info = await page.evaluate(() => {
        // 提取标题
        let title = '';
        const titleEl = document.querySelector('h1, [class*="title"]');
        if (titleEl) {
          title = titleEl.textContent?.trim() || '';
        }

        // 提取描述
        let description = '';
        const descEl = document.querySelector('[class*="desc"], [class*="description"]');
        if (descEl) {
          description = descEl.textContent?.trim() || '';
        }

        // 提取作者
        let author = '';
        const authorEl = document.querySelector('[class*="author"], [class*="nickname"], [class*="user"]');
        if (authorEl) {
          author = authorEl.textContent?.trim() || '';
        }

        // 提取标签
        const tags: string[] = [];
        const tagEls = document.querySelectorAll('a[href*="tag"], [class*="tag"], [class*="hashtag"]');
        tagEls.forEach((el) => {
          const tag = el.textContent?.trim();
          if (tag && tag.startsWith('#')) {
            tags.push(tag);
          }
        });

        // 提取点赞数
        let likes = 0;
        const likeEl = document.querySelector('[class*="like"] span, [data-e2e="like-count"]');
        if (likeEl) {
          const text = likeEl.textContent || '0';
          likes = parseCount(text);
        }

        // 提取评论数
        let comments = 0;
        const commentEl = document.querySelector('[class*="comment"] span, [data-e2e="comment-count"]');
        if (commentEl) {
          const text = commentEl.textContent || '0';
          comments = parseCount(text);
        }

        // 提取分享数
        let shares = 0;
        const shareEl = document.querySelector('[class*="share"] span, [data-e2e="share-count"]');
        if (shareEl) {
          const text = shareEl.textContent || '0';
          shares = parseCount(text);
        }

        // 提取视频 URL
        const videoUrl = window.location.href;

        // 辅助函数：解析数字
        function parseCount(text: string): number {
          const cleaned = text.replace(/[^\d.万千百万亿]/g, '');
          if (text.includes('万')) {
            return Math.floor(parseFloat(cleaned) * 10000);
          } else if (text.includes('千')) {
            return Math.floor(parseFloat(cleaned) * 1000);
          } else if (text.includes('百万')) {
            return Math.floor(parseFloat(cleaned) * 1000000);
          } else if (text.includes('亿')) {
            return Math.floor(parseFloat(cleaned) * 100000000);
          }
          return parseInt(cleaned, 10) || 0;
        }

        return {
          title,
          description,
          author,
          tags,
          likes,
          comments,
          shares,
          videoUrl,
        };
      });

      console.log(`${LOG_PREFIX} 提取视频信息: ${info.title.substring(0, 30)}...`);
      return info;
    } catch (error) {
      console.error(`${LOG_PREFIX} 提取视频信息失败:`, error);
      return {
        title: '',
        description: '',
        tags: [],
        author: '',
      };
    }
  }

  /**
   * 截取视频截图（多帧）
   */
  private async captureVideoScreenshots(): Promise<Buffer[]> {
    const page = this.client.getPage();
    const screenshots: Buffer[] = [];

    try {
      // 尝试找到视频元素
      const videoConfig = douyinSelectors.video.videoPlayer;
      const selectors = getAllSelectors(videoConfig);

      let videoElement: ElementHandle | null = null;
      for (const selector of selectors) {
        try {
          videoElement = await page.$(selector);
          if (videoElement) break;
        } catch {
          continue;
        }
      }

      // 截取多帧
      for (let i = 0; i < this.config.screenshotFrames; i++) {
        try {
          let screenshot: Buffer;

          if (videoElement) {
            // 截取视频元素
            screenshot = await videoElement.screenshot();
          } else {
            // 截取整个页面
            screenshot = await page.screenshot({ fullPage: false });
          }

          screenshots.push(screenshot);

          // 等待一段时间再截取下一帧
          if (i < this.config.screenshotFrames - 1) {
            await page.waitForTimeout(this.config.screenshotInterval);
          }
        } catch (error) {
          console.error(`${LOG_PREFIX} 截取第 ${i + 1} 帧失败:`, error);
        }
      }

      console.log(`${LOG_PREFIX} 成功截取 ${screenshots.length} 帧`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 截取视频截图失败:`, error);
    }

    return screenshots;
  }

  /**
   * 从 URL 直接解析视频
   */
  async parseFromUrl(videoUrl: string): Promise<ParseResult | null> {
    console.log(`${LOG_PREFIX} 从 URL 解析视频: ${videoUrl}`);

    try {
      // 导航到视频页面
      await this.client.navigate(videoUrl);

      // 等待页面加载
      await this.waitForVideoPage();

      // 解析视频信息
      const videoInfo = await this.extractVideoInfo();
      videoInfo.videoUrl = videoUrl;

      // 截取视频截图
      const screenshots = await this.captureVideoScreenshots();

      return {
        videoInfo,
        screenshots,
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} 从 URL 解析视频失败:`, error);
      return null;
    }
  }

  /**
   * 检测聊天窗口中的视频分享卡片并解析
   */
  async findAndParseVideoInChat(): Promise<ParseResult | null> {
    console.log(`${LOG_PREFIX} 在聊天窗口中查找视频分享...`);

    try {
      const page = this.client.getPage();

      // 查找视频分享卡片
      const videoCardConfig = douyinSelectors.message.videoShareCard;
      const selectors = getAllSelectors(videoCardConfig);

      for (const selector of selectors) {
        try {
          const cards = await page.$$(selector);

          for (const card of cards) {
            const result = await this.parseFromCard(card);
            if (result) {
              return result;
            }
          }
        } catch {
          continue;
        }
      }

      console.log(`${LOG_PREFIX} 未找到视频分享卡片`);
      return null;
    } catch (error) {
      console.error(`${LOG_PREFIX} 查找视频分享失败:`, error);
      return null;
    }
  }
}

/**
 * 创建视频解析器实例
 */
export function createVideoParser(
  client: BrowserClient,
  config?: Partial<VideoParserConfig>
): VideoParser {
  return new VideoParser(client, config);
}
