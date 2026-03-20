'use client';

import { useState } from 'react';
import { useReplyLogs, useSettings, toggleAutoReply, updateReplyStyle, approveReply, rejectReply } from '@/lib/api';
import { Card, Button, Table, Toggle, Badge, Pagination, Select, Input } from '@/components/ui';
import type { ReplyLog, ReplyStyle } from '@douyinclaw/shared';

export default function ReplyPage() {
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: settingsData, mutate: mutateSettings } = useSettings();
  const { data: logsData, isLoading: logsLoading, mutate: mutateLogs } = useReplyLogs(page, 10);

  const logs = logsData?.items || [];
  const totalLogs = logsData?.total || 0;

  const autoReplyEnabled = settingsData?.autoReplyEnabled ?? false;
  const replyStyle: ReplyStyle = settingsData?.replyStyle ?? {
    tone: 'casual',
    persona: '',
    maxLength: 100,
  };

  const handleToggleAutoReply = async (enabled: boolean) => {
    try {
      await toggleAutoReply(enabled);
      mutateSettings();
    } catch (error) {
      console.error('Failed to toggle auto reply:', error);
    }
  };

  const handleUpdateStyle = async (updates: Partial<ReplyStyle>) => {
    try {
      await updateReplyStyle({ ...replyStyle, ...updates });
      mutateSettings();
    } catch (error) {
      console.error('Failed to update style:', error);
    }
  };

  const handleApprove = async (logId: string) => {
    setProcessing(logId);
    try {
      await approveReply(logId);
      mutateLogs();
    } catch (error) {
      console.error('Failed to approve reply:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (logId: string) => {
    setProcessing(logId);
    try {
      await rejectReply(logId);
      mutateLogs();
    } catch (error) {
      console.error('Failed to reject reply:', error);
    } finally {
      setProcessing(null);
    }
  };

  const toneOptions = [
    { value: 'casual', label: '随意轻松' },
    { value: 'humorous', label: '幽默风趣' },
    { value: 'analytical', label: '分析讨论' },
    { value: 'brief', label: '简洁短句' },
  ];

  const logColumns = [
    {
      key: 'videoTitle',
      title: '视频标题',
      render: (log: ReplyLog) => (
        <div className="max-w-[200px]">
          <p className="text-white truncate">{log.videoTitle}</p>
          {log.videoUrl && (
            <a
              href={log.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-douyin-primary text-xs hover:underline"
            >
              查看视频
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'aiReply',
      title: 'AI 回复内容',
      render: (log: ReplyLog) => (
        <p className="text-gray-300 truncate max-w-[300px]">{log.aiReply}</p>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (log: ReplyLog) => {
        const variants: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
          pending: 'warning',
          sent: 'success',
          rejected: 'error',
        };
        const labels: Record<string, string> = {
          pending: '待审批',
          sent: '已发送',
          rejected: '已拒绝',
        };
        return <Badge variant={variants[log.status]}>{labels[log.status]}</Badge>;
      },
    },
    {
      key: 'sentAt',
      title: '时间',
      render: (log: ReplyLog) => (
        <span className="text-gray-400">{formatDateTime(log.sentAt)}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (log: ReplyLog) =>
        log.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleApprove(log.id)}
              loading={processing === log.id}
            >
              批准
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleReject(log.id)}
              loading={processing === log.id}
            >
              拒绝
            </Button>
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">智能回复</h1>
        <p className="text-gray-400 mt-1">AI 自动回复视频分享消息</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <Card title="回复设置" className="lg:col-span-1">
          <div className="space-y-6">
            {/* Auto Reply Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">自动回复</p>
                <p className="text-gray-400 text-sm">收到视频分享时自动回复</p>
              </div>
              <Toggle
                checked={autoReplyEnabled}
                onChange={handleToggleAutoReply}
              />
            </div>

            {/* Tone Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                回复风格
              </label>
              <Select
                options={toneOptions}
                value={replyStyle.tone}
                onChange={(e) => handleUpdateStyle({ tone: e.target.value as ReplyStyle['tone'] })}
              />
            </div>

            {/* Persona */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                人设描述
              </label>
              <Input
                placeholder="例如: 一个喜欢吐槽的朋友"
                value={replyStyle.persona || ''}
                onChange={(e) => handleUpdateStyle({ persona: e.target.value })}
              />
              <p className="text-gray-500 text-xs mt-1">
                描述你的性格特点，AI 会据此生成回复
              </p>
            </div>

            {/* Max Length */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                最大字数
              </label>
              <Input
                type="number"
                min={20}
                max={500}
                value={replyStyle.maxLength || 100}
                onChange={(e) =>
                  handleUpdateStyle({ maxLength: parseInt(e.target.value) || 100 })
                }
              />
            </div>
          </div>
        </Card>

        {/* Reply Logs */}
        <Card
          title="回复记录"
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="sm" onClick={() => mutateLogs()}>
              <RefreshIcon className="w-4 h-4 mr-2" />
              刷新
            </Button>
          }
        >
          <Table
            columns={logColumns}
            data={logs}
            keyExtractor={(log) => log.id}
            loading={logsLoading}
            emptyMessage="暂无回复记录"
          />
          {totalLogs > 10 && (
            <Pagination
              page={page}
              pageSize={10}
              total={totalLogs}
              onChange={setPage}
            />
          )}
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <BrainIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="text-white font-medium">AI 分析</h4>
              <p className="text-gray-400 text-sm mt-1">
                AI 会分析视频内容，理解主题和情感
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <ChatIcon className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h4 className="text-white font-medium">个性化回复</h4>
              <p className="text-gray-400 text-sm mt-1">
                根据你设置的人设和风格生成回复
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldIcon className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h4 className="text-white font-medium">审批机制</h4>
              <p className="text-gray-400 text-sm mt-1">
                可开启审批模式，人工确认后再发送
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Helpers
function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN');
}

// Icons
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
