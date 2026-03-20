/**
 * 抖音网页版选择器配置
 * 集中管理所有 CSS/XPath 选择器，便于维护和应对抖音改版
 */

export interface SelectorConfig {
  /** 主选择器 */
  primary: string;
  /** 备选选择器 */
  fallbacks: string[];
  /** 描述 */
  description: string;
}

export interface Selectors {
  // 登录相关
  login: {
    qrcode: SelectorConfig;
    qrcodeContainer: SelectorConfig;
    loginSuccess: SelectorConfig;
    userProfile: SelectorConfig;
  };

  // 消息相关
  message: {
    messageIcon: SelectorConfig;
    messagePanel: SelectorConfig;
    conversationList: SelectorConfig;
    conversationItem: SelectorConfig;
    unreadBadge: SelectorConfig;
    chatWindow: SelectorConfig;
    chatInput: SelectorConfig;
    sendButton: SelectorConfig;
    messageItem: SelectorConfig;
    videoShareCard: SelectorConfig;
  };

  // 火花相关
  spark: {
    sparkIcon: SelectorConfig;
    sparkDays: SelectorConfig;
    friendList: SelectorConfig;
    friendItem: SelectorConfig;
    friendName: SelectorConfig;
  };

  // 视频相关
  video: {
    videoPlayer: SelectorConfig;
    videoTitle: SelectorConfig;
    videoDescription: SelectorConfig;
    videoAuthor: SelectorConfig;
    likeCount: SelectorConfig;
    commentCount: SelectorConfig;
    shareCount: SelectorConfig;
    tagList: SelectorConfig;
    tagItem: SelectorConfig;
  };

  // 通用
  common: {
    loadingSpinner: SelectorConfig;
    errorToast: SelectorConfig;
    successToast: SelectorConfig;
    closeButton: SelectorConfig;
    confirmButton: SelectorConfig;
  };
}

/**
 * 抖音选择器配置
 * 每个选择器都有主选择器和备选选择器
 */
export const douyinSelectors: Selectors = {
  // 登录相关
  login: {
    qrcode: {
      primary: 'canvas[class*="qrcode"]',
      fallbacks: [
        'img[src*="qrcode"]',
        'div[class*="qr"] canvas',
        'div[class*="login"] canvas',
      ],
      description: '登录二维码',
    },
    qrcodeContainer: {
      primary: 'div[class*="qrcode-container"]',
      fallbacks: [
        'div[class*="login-container"]',
        'div[class*="login"] div[class*="qr"]',
      ],
      description: '二维码容器',
    },
    loginSuccess: {
      primary: 'div[class*="avatar"]',
      fallbacks: [
        'img[class*="avatar"]',
        'div[class*="user-info"]',
      ],
      description: '登录成功标识',
    },
    userProfile: {
      primary: 'div[class*="user-profile"]',
      fallbacks: [
        'div[class*="user-info"]',
        'div[class*="nickname"]',
      ],
      description: '用户信息',
    },
  },

  // 消息相关
  message: {
    messageIcon: {
      primary: 'div[class*="message-icon"]',
      fallbacks: [
        'a[href*="message"]',
        'div[class*="nav"] div[class*="message"]',
        '[data-e2e="message-icon"]',
      ],
      description: '消息图标',
    },
    messagePanel: {
      primary: 'div[class*="message-panel"]',
      fallbacks: [
        'div[class*="message-list"]',
        'div[class*="chat-list"]',
      ],
      description: '消息面板',
    },
    conversationList: {
      primary: 'div[class*="conversation-list"]',
      fallbacks: [
        'div[class*="chat-list"]',
        'div[class*="session-list"]',
        'ul[class*="conversation"]',
      ],
      description: '会话列表',
    },
    conversationItem: {
      primary: 'div[class*="conversation-item"]',
      fallbacks: [
        'li[class*="chat-item"]',
        'div[class*="session-item"]',
        'div[class*="chat"] div[role="listitem"]',
      ],
      description: '单个会话',
    },
    unreadBadge: {
      primary: 'span[class*="unread"]',
      fallbacks: [
        'div[class*="badge"]',
        'span[class*="count"]',
        '[class*="unread-count"]',
      ],
      description: '未读消息标记',
    },
    chatWindow: {
      primary: 'div[class*="chat-window"]',
      fallbacks: [
        'div[class*="chat-container"]',
        'div[class*="message-container"]',
      ],
      description: '聊天窗口',
    },
    chatInput: {
      primary: 'textarea[class*="chat-input"]',
      fallbacks: [
        'div[class*="input"] textarea',
        'div[contenteditable="true"]',
        'textarea[placeholder*="消息"]',
      ],
      description: '聊天输入框',
    },
    sendButton: {
      primary: 'button[class*="send"]',
      fallbacks: [
        'div[class*="send"] button',
        'button:has-text("发送")',
        '[data-e2e="send-button"]',
      ],
      description: '发送按钮',
    },
    messageItem: {
      primary: 'div[class*="message-item"]',
      fallbacks: [
        'div[class*="msg-item"]',
        'div[class*="bubble"]',
      ],
      description: '单条消息',
    },
    videoShareCard: {
      primary: 'div[class*="video-card"]',
      fallbacks: [
        'div[class*="share-card"]',
        'div[class*="link-card"]',
        'a[class*="video"]',
      ],
      description: '视频分享卡片',
    },
  },

  // 火花相关
  spark: {
    sparkIcon: {
      primary: 'span[class*="spark"]',
      fallbacks: [
        'img[src*="spark"]',
        'div[class*="fire"]',
        '[class*="huohua"]',
      ],
      description: '火花图标',
    },
    sparkDays: {
      primary: 'span[class*="spark-days"]',
      fallbacks: [
        'div[class*="spark"] span',
        '[class*="days"]',
      ],
      description: '火花天数',
    },
    friendList: {
      primary: 'div[class*="friend-list"]',
      fallbacks: [
        'div[class*="contact-list"]',
        'ul[class*="friend"]',
      ],
      description: '好友列表',
    },
    friendItem: {
      primary: 'div[class*="friend-item"]',
      fallbacks: [
        'li[class*="contact-item"]',
        'div[class*="user-item"]',
      ],
      description: '单个好友',
    },
    friendName: {
      primary: 'span[class*="friend-name"]',
      fallbacks: [
        'div[class*="nickname"]',
        'span[class*="name"]',
        '[class*="username"]',
      ],
      description: '好友名称',
    },
  },

  // 视频相关
  video: {
    videoPlayer: {
      primary: 'video',
      fallbacks: [
        'div[class*="video-player"] video',
        'video[class*="player"]',
      ],
      description: '视频播放器',
    },
    videoTitle: {
      primary: 'h1[class*="title"]',
      fallbacks: [
        'div[class*="video-title"]',
        'span[class*="title"]',
        'h1',
      ],
      description: '视频标题',
    },
    videoDescription: {
      primary: 'div[class*="description"]',
      fallbacks: [
        'span[class*="desc"]',
        'div[class*="video-info"] p',
      ],
      description: '视频描述',
    },
    videoAuthor: {
      primary: 'a[class*="author"]',
      fallbacks: [
        'div[class*="user"] a',
        'span[class*="nickname"]',
        '[class*="author-name"]',
      ],
      description: '视频作者',
    },
    likeCount: {
      primary: 'span[class*="like-count"]',
      fallbacks: [
        'button[class*="like"] span',
        'div[class*="count"] span',
        '[data-e2e="like-count"]',
      ],
      description: '点赞数',
    },
    commentCount: {
      primary: 'span[class*="comment-count"]',
      fallbacks: [
        'button[class*="comment"] span',
        '[data-e2e="comment-count"]',
      ],
      description: '评论数',
    },
    shareCount: {
      primary: 'span[class*="share-count"]',
      fallbacks: [
        'button[class*="share"] span',
        '[data-e2e="share-count"]',
      ],
      description: '分享数',
    },
    tagList: {
      primary: 'div[class*="tag-list"]',
      fallbacks: [
        'div[class*="tags"]',
        'div[class*="hashtag"]',
      ],
      description: '标签列表',
    },
    tagItem: {
      primary: 'a[class*="tag"]',
      fallbacks: [
        'span[class*="hashtag"]',
        'a[href*="tag"]',
      ],
      description: '单个标签',
    },
  },

  // 通用
  common: {
    loadingSpinner: {
      primary: 'div[class*="loading"]',
      fallbacks: [
        'span[class*="spinner"]',
        'div[class*="loader"]',
      ],
      description: '加载中动画',
    },
    errorToast: {
      primary: 'div[class*="error-toast"]',
      fallbacks: [
        'div[class*="toast"][class*="error"]',
        'div[class*="message"][class*="error"]',
      ],
      description: '错误提示',
    },
    successToast: {
      primary: 'div[class*="success-toast"]',
      fallbacks: [
        'div[class*="toast"][class*="success"]',
        'div[class*="message"][class*="success"]',
      ],
      description: '成功提示',
    },
    closeButton: {
      primary: 'button[class*="close"]',
      fallbacks: [
        'div[class*="close"]',
        '[aria-label="关闭"]',
        '[aria-label="Close"]',
      ],
      description: '关闭按钮',
    },
    confirmButton: {
      primary: 'button[class*="confirm"]',
      fallbacks: [
        'button:has-text("确定")',
        'button:has-text("确认")',
        'button[type="submit"]',
      ],
      description: '确认按钮',
    },
  },
};

/**
 * 尝试选择器配置中的所有选择器，直到找到匹配的元素
 */
export function getSelector(config: SelectorConfig): string {
  return config.primary;
}

/**
 * 获取所有备选选择器（包括主选择器）
 */
export function getAllSelectors(config: SelectorConfig): string[] {
  return [config.primary, ...config.fallbacks];
}

/**
 * XPath 选择器配置
 * 用于一些复杂的 DOM 查询场景
 */
export const xpathSelectors = {
  /** 根据文本内容查找好友 */
  friendByName: (name: string) =>
    `//div[contains(@class, "friend") and contains(., "${name}")]`,

  /** 根据文本内容查找会话 */
  conversationByName: (name: string) =>
    `//div[contains(@class, "conversation") and contains(., "${name}")]`,

  /** 查找包含火花图标的元素 */
  sparkElement: '//span[contains(@class, "spark") or contains(@class, "fire")]',

  /** 查找视频分享卡片 */
  videoCard: '//div[contains(@class, "video") and contains(@class, "card")]',

  /** 根据文本查找按钮 */
  buttonByText: (text: string) =>
    `//button[contains(text(), "${text}")]`,

  /** 查找未读消息数量 */
  unreadCount: '//span[contains(@class, "unread")]/text()',
};
