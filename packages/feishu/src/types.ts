/**
 * 飞书机器人类型定义
 */

import type { FeishuNotification, FeishuCommand } from '@douyinclaw/shared';

// 重新导出共享类型
export type { FeishuNotification, FeishuCommand };

/**
 * 飞书机器人配置
 */
export interface FeishuBotConfig {
  /** 飞书应用 App ID */
  appId: string;
  /** 飞书应用 App Secret */
  appSecret: string;
  /** 事件订阅 Verify Token */
  verifyToken?: string;
  /** 事件订阅 Encrypt Key */
  encryptKey?: string;
  /** 接收通知的用户 Open ID (可选) */
  notifyOpenId?: string;
  /** 接收通知的群聊 ID (可选) */
  notifyChatId?: string;
}

/**
 * 飞书消息事件
 */
export interface FeishuEvent {
  /** 事件类型 */
  type: string;
  /** 事件 UUID */
  uuid: string;
  /** 事件创建时间戳 */
  ts: string;
  /** 事件 token */
  token?: string;
  /** 事件数据 */
  event: FeishuEventData;
}

/**
 * 飞书事件数据
 */
export interface FeishuEventData {
  /** 聊天类型: P2P(单聊) / group(群聊) */
  chat_type: string;
  /** 消息类型: text / post / image 等 */
  msg_type: string;
  /** 发送者信息 */
  sender: FeishuSender;
  /** 消息内容 */
  message?: FeishuMessage;
}

/**
 * 飞书发送者信息
 */
export interface FeishuSender {
  /** 发送者 Open ID */
  sender_id: {
    open_id: string;
    union_id?: string;
    user_id?: string;
  };
  /** 发送者类型 */
  sender_type: string;
  /** 租户 key */
  tenant_key: string;
}

/**
 * 飞书消息内容
 */
export interface FeishuMessage {
  /** 消息 ID */
  message_id: string;
  /** 根消息 ID */
  root_id?: string;
  /** 父消息 ID */
  parent_id?: string;
  /** 创建时间 */
  create_time: string;
  /** 聊天 ID */
  chat_id: string;
  /** 消息类型 */
  msg_type: string;
  /** 消息内容 (JSON 字符串或文本) */
  content: string;
}

/**
 * 飞书 API 响应
 */
export interface FeishuApiResponse<T = unknown> {
  /** 状态码 */
  code: number;
  /** 消息 */
  msg: string;
  /** 数据 */
  data?: T;
}

/**
 * 飞书访问令牌响应
 */
export interface FeishuTokenResponse {
  /** 访问令牌 */
  app_access_token: string;
  /** 过期时间(秒) */
  expire: number;
}

/**
 * 飞书发送消息请求
 */
export interface FeishuSendMessageRequest {
  /** 接收消息的用户 Open ID */
  receive_id?: string;
  /** 接收消息 ID 类型: open_id / user_id / union_id / email / chat_id */
  receive_id_type?: string;
  /** 消息类型: text / post / interactive 等 */
  msg_type: string;
  /** 消息内容 */
  content: string;
}

/**
 * 飞书文本消息内容
 */
export interface FeishuTextContent {
  text: string;
}

/**
 * 飞书富文本消息内容
 */
export interface FeishuPostContent {
  zh_cn: {
    title: string;
    content: FeishuPostSection[][];
  };
}

/**
 * 飞书富文本段落
 */
export interface FeishuPostSection {
  tag: string;
  text?: string;
  href?: string;
  user_id?: string;
}

/**
 * 命令处理结果
 */
export interface CommandResult {
  /** 是否成功 */
  success: boolean;
  /** 回复消息 */
  message: string;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 命令处理器函数类型
 */
export type CommandHandler = (
  command: FeishuCommand,
  event: FeishuEvent
) => Promise<CommandResult>;

/**
 * 飞书机器人事件回调
 */
export interface FeishuBotCallbacks {
  /** 收到命令时回调 */
  onCommand?: (command: FeishuCommand, event: FeishuEvent) => Promise<CommandResult>;
  /** 发送通知时回调 */
  onNotify?: (notification: FeishuNotification) => void;
  /** 错误时回调 */
  onError?: (error: Error, context?: string) => void;
}
