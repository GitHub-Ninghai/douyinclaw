/**
 * DouyinClaw 共享类型定义
 */

// ==================== 账号相关 ====================

export interface Account {
  id: string;
  nickname: string;
  storagePath: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type AccountStatus = 'active' | 'inactive' | 'expired' | 'error';

// ==================== 好友相关 ====================

export interface Friend {
  id: string;
  accountId: string;
  nickname: string;
  sparkDays: number;
  isSparkEnabled: boolean;
  replyStyle: ReplyStyle;
  lastInteraction?: Date;
  createdAt: Date;
}

// ==================== 火花相关 ====================

export interface SparkFriend {
  friendName: string;
  sparkDays: number;
  lastInteraction?: Date;
}

export interface SparkResult {
  friendId: string;
  friendName: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  error?: string;
  sentAt: Date;
}

export interface SparkLog {
  id: string;
  friendId: string;
  message: string;
  status: 'success' | 'failed';
  sentAt: Date;
}

// ==================== AI Provider 相关 ====================

export type AIProviderType = 'claude' | 'glm' | 'qwen' | 'minimax';

export interface AIProviderConfig {
  provider: AIProviderType;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface GLMConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface QwenConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface MiniMaxConfig {
  apiKey: string;
  groupId: string;
  model?: string;
  maxTokens?: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface LLMProviderInfo {
  name: string;
  type: AIProviderType;
  supportsVision: boolean;
  models: string[];
  defaultModel: string;
}

// ==================== AI 回复相关 ====================

export interface VideoInfo {
  title: string;
  description: string;
  tags: string[];
  author: string;
  likes?: number;
  comments?: number;
  shares?: number;
  videoUrl?: string;
}

export interface VideoAnalysis {
  summary: string;
  mood: string;
  topics: string[];
  keyElements: string[];
}

export interface ReplyStyle {
  tone: 'casual' | 'humorous' | 'analytical' | 'brief';
  persona?: string;
  maxLength?: number;
}

export interface ReplyConfig {
  style: ReplyStyle;
  maxLength: number;
  language: string;
  requireApproval: boolean;
}

export interface ReplyResult {
  reply: string;
  analysis: VideoAnalysis;
  tokensUsed: { input: number; output: number };
  confidence: number;
}

export interface ReplyLog {
  id: string;
  friendId: string;
  videoTitle: string;
  videoUrl?: string;
  aiReply: string;
  status: 'pending' | 'sent' | 'rejected';
  sentAt: Date;
}

// ==================== 消息相关 ====================

export interface Message {
  from: string;
  type: 'text' | 'video_share' | 'image' | 'other';
  content: string;
  timestamp: Date;
}

export interface MessagePoolItem {
  id: string;
  content: string;
  category: 'spark' | 'greeting' | 'reply';
  usedCount: number;
  createdAt: Date;
}

// ==================== 设置相关 ====================

export interface AppSettings {
  // 火花设置
  sparkCron1: string; // e.g., "0 8 * * *"
  sparkCron2: string; // e.g., "0 20 * * *"

  // 消息检查
  messageCheckInterval: number; // ms

  // 会话心跳
  sessionHeartbeatInterval: number; // ms

  // AI 设置
  aiProvider: AIProviderType;
  aiModel: string;
  aiMaxTokens: number;

  // 飞书通知
  feishuEnabled: boolean;
  feishuNotifyOnSpark: boolean;
  feishuNotifyOnReply: boolean;
  feishuNotifyOnError: boolean;

  // 自动回复
  autoReplyEnabled: boolean;
  replyRequireApproval: boolean;
  replyStyle?: ReplyStyle;
}

export interface SettingItem {
  key: string;
  value: string; // JSON string
}

// ==================== 系统状态 ====================

export interface SystemStatus {
  loginStatus: AccountStatus;
  todaySpark: {
    success: number;
    failed: number;
    total: number;
  };
  todayReplies: number;
  nextSparkTime?: Date;
  lastError?: string;
  uptime: number;
}

// ==================== API 响应 ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== 任务相关 ====================

export interface TaskJob {
  id: string;
  type: 'spark' | 'reply' | 'heartbeat' | 'message_check';
  status: 'pending' | 'running' | 'completed' | 'failed';
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ==================== 飞书相关 ====================

export interface FeishuNotification {
  type: 'spark_report' | 'reply' | 'alert' | 'daily_summary';
  title: string;
  content: string;
  data?: Record<string, unknown>;
}

export interface FeishuCommand {
  command: string;
  args: string[];
  fromUser: string;
}
