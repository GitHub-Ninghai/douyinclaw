/**
 * API 请求封装
 * 使用 SWR 进行数据管理
 */

import useSWR, { SWRConfiguration, mutate } from 'swr';
import type {
  SparkLog,
  ReplyLog,
  PaginatedResponse,
  AppSettings,
  Friend,
  MessagePoolItem,
  LLMProviderInfo
} from '@douyinclaw/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 通用 fetcher
const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    const error = new Error('API request failed');
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return res.json();
};

// POST/PUT/DELETE 请求
export const api = {
  get: async <T>(url: string): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  put: async <T>(url: string, data?: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  delete: async <T>(url: string): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },
};

// ==================== Types ====================

// 系统状态响应
export interface SystemStatusResponse {
  loginStatus: 'active' | 'inactive' | 'expired' | 'error';
  todaySpark: {
    success: number;
    failed: number;
    total: number;
  };
  todayReplies: number;
  nextSparkTime?: string;
  lastError?: string;
  uptime: number;
}

// 好友列表响应
export interface FriendsListResponse {
  items: Friend[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 日志条目类型
export interface LogEntry {
  id: string;
  type: 'spark' | 'reply' | 'system' | 'error';
  message: string;
  level: 'info' | 'warn' | 'error';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// AI Provider 列表响应类型
export interface AIProvidersListResponse {
  providers: LLMProviderInfo[];
  categories: string[];
}

// ==================== SWR Hooks ====================

// 系统状态
export function useSystemStatus(config?: SWRConfiguration) {
  return useSWR<SystemStatusResponse>('/api/status', fetcher, {
    refreshInterval: 5000,
    ...config,
  });
}

// 登录状态和二维码
export function useLoginStatus(config?: SWRConfiguration) {
  return useSWR<{ status: string; qrCode?: string }>('/api/login/status', fetcher, {
    refreshInterval: 3000,
    ...config,
  });
}

// 好友列表
export function useFriends(config?: SWRConfiguration) {
  return useSWR<FriendsListResponse>('/api/friends', fetcher, config);
}

// 火花日志
export function useSparkLogs(page = 1, pageSize = 20, config?: SWRConfiguration) {
  return useSWR<PaginatedResponse<SparkLog>>(`/api/spark/logs?page=${page}&pageSize=${pageSize}`, fetcher, config);
}

// 回复记录
export function useReplyLogs(page = 1, pageSize = 20, config?: SWRConfiguration) {
  return useSWR<PaginatedResponse<ReplyLog>>(`/api/reply/logs?page=${page}&pageSize=${pageSize}`, fetcher, config);
}

// 应用设置
export function useSettings(config?: SWRConfiguration) {
  return useSWR<AppSettings>('/api/settings', fetcher, config);
}

// 消息池
export function useMessagePool(category?: string, config?: SWRConfiguration) {
  const url = category ? `/api/messages?category=${category}` : '/api/messages';
  return useSWR<MessagePoolItem[]>(url, fetcher, config);
}

// 系统日志
export function useLogs(params: {
  page?: number;
  pageSize?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}, config?: SWRConfiguration) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.type) searchParams.set('type', params.type);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);

  const query = searchParams.toString();
  return useSWR<PaginatedResponse<LogEntry>>(`/api/logs${query ? `?${query}` : ''}`, fetcher, config);
}

// AI Provider 列表
export function useAIProviders(config?: SWRConfiguration) {
  return useSWR<AIProvidersListResponse>('/api/ai/providers', fetcher, config);
}

// ==================== Mutation Actions ====================

// 登录相关
export async function getQRCode() {
  return api.post<{ qrUrl: string; expireAt: string }>('/api/login/qrcode');
}

export async function logout() {
  return api.post('/api/login/logout');
}

// 火花相关
export async function toggleSpark(friendId: string, enabled: boolean) {
  return api.put(`/api/friends/${friendId}/spark`, { enabled });
}

export async function sendSparkNow(friendId: string) {
  return api.post(`/api/spark/send`, { friendId });
}

export async function sendSparkToAll() {
  return api.post('/api/spark/send-all');
}

// 回复相关
export async function toggleAutoReply(enabled: boolean) {
  return api.put('/api/reply/auto', { enabled });
}

export async function updateReplyStyle(style: {
  tone: 'casual' | 'humorous' | 'analytical' | 'brief';
  persona?: string;
  maxLength?: number;
}) {
  return api.put('/api/reply/style', style);
}

export async function approveReply(logId: string) {
  return api.post(`/api/reply/approve/${logId}`);
}

export async function rejectReply(logId: string) {
  return api.post(`/api/reply/reject/${logId}`);
}

// 设置相关
export async function updateSettings(settings: Record<string, unknown>) {
  return api.put('/api/settings', settings);
}

export async function updateAIProvider(provider: string, config: Record<string, unknown>) {
  return api.put('/api/ai/provider', { provider, config });
}

// 消息池相关
export async function addMessage(data: { content: string; category: string }) {
  return api.post('/api/messages', data);
}

export async function updateMessage(id: string, data: { content: string; category: string }) {
  return api.put(`/api/messages/${id}`, data);
}

export async function deleteMessage(id: string) {
  return api.delete(`/api/messages/${id}`);
}

// 刷新数据
export function refreshAll() {
  mutate((key) => typeof key === 'string' && key.startsWith('/api/'));
}

export function refreshFriends() {
  mutate('/api/friends');
}

export function refreshSettings() {
  mutate('/api/settings');
}

export function refreshSparkLogs() {
  mutate((key) => typeof key === 'string' && key.startsWith('/api/spark/logs'));
}

export function refreshReplyLogs() {
  mutate((key) => typeof key === 'string' && key.startsWith('/api/reply/logs'));
}
