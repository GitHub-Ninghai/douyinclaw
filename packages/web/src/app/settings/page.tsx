'use client';

import { useState } from 'react';
import { useSettings, useAIProviders, updateSettings } from '@/lib/api';
import { Card, Input, Select, Toggle } from '@/components/ui';
import type { AIProviderType, AppSettings } from '@douyinclaw/shared';

export default function SettingsPage() {
  const { data: settingsData, mutate } = useSettings();
  const { data: providersData } = useAIProviders();

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'spark' | 'ai' | 'feishu' | 'general'>('spark');

  const settings: AppSettings = settingsData || {
    sparkCron1: '0 8 * * *',
    sparkCron2: '0 20 * * *',
    messageCheckInterval: 30000,
    sessionHeartbeatInterval: 60000,
    aiProvider: 'claude' as AIProviderType,
    aiModel: '',
    aiMaxTokens: 1024,
    feishuEnabled: false,
    feishuNotifyOnSpark: true,
    feishuNotifyOnReply: true,
    feishuNotifyOnError: true,
    autoReplyEnabled: false,
    replyRequireApproval: false,
  };

  const handleUpdate = async (updates: Partial<AppSettings>) => {
    setSaving(true);
    try {
      await updateSettings(updates);
      mutate();
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const providerOptions = [
    { value: 'claude', label: 'Claude (Anthropic)' },
    { value: 'glm', label: 'GLM (智谱)' },
    { value: 'qwen', label: 'Qwen (通义千问)' },
    { value: 'minimax', label: 'MiniMax' },
  ];

  const tabs = [
    { key: 'spark', label: '火花设置', icon: FireIcon },
    { key: 'ai', label: 'AI 配置', icon: BrainIcon },
    { key: 'feishu', label: '飞书通知', icon: BellIcon },
    { key: 'general', label: '通用设置', icon: SettingsIcon },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">系统设置</h1>
        <p className="text-gray-400 mt-1">配置 DouyinClaw 运行参数</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-douyin-primary/20 text-douyin-primary'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Spark Settings */}
      {activeTab === 'spark' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="火花发送时间">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  第一次发送时间 (Cron)
                </label>
                <Input
                  value={settings.sparkCron1}
                  onChange={(e) => handleUpdate({ sparkCron1: e.target.value })}
                  placeholder="0 8 * * *"
                />
                <p className="text-gray-500 text-xs mt-1">
                  示例: 0 8 * * * 表示每天早上 8 点
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  第二次发送时间 (Cron)
                </label>
                <Input
                  value={settings.sparkCron2}
                  onChange={(e) => handleUpdate({ sparkCron2: e.target.value })}
                  placeholder="0 20 * * *"
                />
                <p className="text-gray-500 text-xs mt-1">
                  示例: 0 20 * * * 表示每天晚上 8 点
                </p>
              </div>
            </div>
          </Card>

          <Card title="Cron 表达式说明">
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-gray-700/50 rounded-lg">
                <code className="text-douyin-primary">* * * * *</code>
                <div className="text-gray-400 mt-2">
                  <p>分 时 日 月 周</p>
                </div>
              </div>

              <div className="space-y-2 text-gray-400">
                <p><span className="text-white">0 8 * * *</span> - 每天 8:00</p>
                <p><span className="text-white">0 */2 * * *</span> - 每 2 小时</p>
                <p><span className="text-white">0 9-17 * * 1-5</span> - 工作日 9-17 点</p>
                <p><span className="text-white">30 8 * * *</span> - 每天 8:30</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* AI Settings */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="AI 提供商配置">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI 提供商
                </label>
                <Select
                  options={providerOptions}
                  value={settings.aiProvider}
                  onChange={(e) =>
                    handleUpdate({ aiProvider: e.target.value as AIProviderType })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  模型名称
                </label>
                <Input
                  value={settings.aiModel}
                  onChange={(e) => handleUpdate({ aiModel: e.target.value })}
                  placeholder="例如: claude-3-opus-20240229"
                />
                <p className="text-gray-500 text-xs mt-1">
                  留空则使用默认模型
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  最大 Token 数
                </label>
                <Input
                  type="number"
                  min={100}
                  max={4096}
                  value={settings.aiMaxTokens}
                  onChange={(e) =>
                    handleUpdate({ aiMaxTokens: parseInt(e.target.value) || 1024 })
                  }
                />
              </div>
            </div>
          </Card>

          <Card title="提供商信息">
            <div className="space-y-4">
              {providersData?.providers?.map((provider: { name: string; type: string; models: string[] }) => (
                <div
                  key={provider.type}
                  className="p-4 bg-gray-700/50 rounded-lg"
                >
                  <h4 className="text-white font-medium">{provider.name}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {provider.models.map((model) => (
                      <span
                        key={model}
                        className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Feishu Settings */}
      {activeTab === 'feishu' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="飞书通知配置">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">启用飞书通知</p>
                  <p className="text-gray-400 text-sm">接收系统事件通知</p>
                </div>
                <Toggle
                  checked={settings.feishuEnabled}
                  onChange={(checked) => handleUpdate({ feishuEnabled: checked })}
                />
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">火花发送通知</p>
                    <p className="text-gray-400 text-sm">火花发送成功/失败时通知</p>
                  </div>
                  <Toggle
                    checked={settings.feishuNotifyOnSpark}
                    onChange={(checked) => handleUpdate({ feishuNotifyOnSpark: checked })}
                    disabled={!settings.feishuEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">AI 回复通知</p>
                    <p className="text-gray-400 text-sm">AI 自动回复时通知</p>
                  </div>
                  <Toggle
                    checked={settings.feishuNotifyOnReply}
                    onChange={(checked) => handleUpdate({ feishuNotifyOnReply: checked })}
                    disabled={!settings.feishuEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">错误通知</p>
                    <p className="text-gray-400 text-sm">系统出错时通知</p>
                  </div>
                  <Toggle
                    checked={settings.feishuNotifyOnError}
                    onChange={(checked) => handleUpdate({ feishuNotifyOnError: checked })}
                    disabled={!settings.feishuEnabled}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title="飞书机器人配置">
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">配置说明</p>
                    <p className="text-gray-400 text-sm mt-1">
                      飞书机器人配置需要在环境变量中设置
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-gray-400 text-sm space-y-2">
                <p>需要配置的环境变量:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>FEISHU_APP_ID</li>
                  <li>FEISHU_APP_SECRET</li>
                  <li>FEISHU_ENCRYPT_KEY</li>
                  <li>FEISHU_VERIFICATION_TOKEN</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="自动回复">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">启用自动回复</p>
                  <p className="text-gray-400 text-sm">收到视频分享时自动回复</p>
                </div>
                <Toggle
                  checked={settings.autoReplyEnabled}
                  onChange={(checked) => handleUpdate({ autoReplyEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">需要审批</p>
                  <p className="text-gray-400 text-sm">AI 回复需人工确认后发送</p>
                </div>
                <Toggle
                  checked={settings.replyRequireApproval}
                  onChange={(checked) => handleUpdate({ replyRequireApproval: checked })}
                />
              </div>
            </div>
          </Card>

          <Card title="系统参数">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  消息检查间隔 (毫秒)
                </label>
                <Input
                  type="number"
                  min={5000}
                  max={300000}
                  value={settings.messageCheckInterval}
                  onChange={(e) =>
                    handleUpdate({ messageCheckInterval: parseInt(e.target.value) || 30000 })
                  }
                />
                <p className="text-gray-500 text-xs mt-1">
                  检查新消息的频率，默认 30 秒
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  会话心跳间隔 (毫秒)
                </label>
                <Input
                  type="number"
                  min={30000}
                  max={600000}
                  value={settings.sessionHeartbeatInterval}
                  onChange={(e) =>
                    handleUpdate({ sessionHeartbeatInterval: parseInt(e.target.value) || 60000 })
                  }
                />
                <p className="text-gray-500 text-xs mt-1">
                  保持登录状态的频率，默认 60 秒
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Save Indicator */}
      {saving && (
        <div className="fixed bottom-6 right-6 bg-douyin-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          保存中...
        </div>
      )}
    </div>
  );
}

// Icons
function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
