'use client';

import { useSystemStatus, useSparkLogs, useReplyLogs } from '@/lib/api';
import { Card, Badge, StatusIndicator } from '@/components/ui';
import { AgentStatus } from '@/components';
import type { SparkLog, ReplyLog } from '@douyinclaw/shared';

export default function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useSystemStatus();
  const { data: sparkLogs } = useSparkLogs(1, 5);
  const { data: replyLogs } = useReplyLogs(1, 5);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">仪表盘</h1>
        <p className="text-gray-400 mt-1">系统状态总览</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Login Status Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">登录状态</p>
              {statusLoading ? (
                <div className="h-6 w-16 bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <StatusIndicator
                  status={status?.loginStatus === 'active' ? 'active' : 'inactive'}
                  label={status?.loginStatus === 'active' ? '已登录' : '未登录'}
                />
              )}
            </div>
            <div className="w-12 h-12 rounded-lg bg-douyin-primary/20 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-douyin-primary" />
            </div>
          </div>
        </Card>

        {/* Today Spark Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">今日火花</p>
              {statusLoading ? (
                <div className="h-6 w-20 bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-green-400">
                    {status?.todaySpark?.success || 0}
                  </span>
                  <span className="text-gray-500">/</span>
                  <span className="text-lg text-red-400">
                    {status?.todaySpark?.failed || 0}
                  </span>
                </div>
              )}
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <SparkIcon className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </Card>

        {/* Today Replies Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">今日回复</p>
              {statusLoading ? (
                <div className="h-6 w-16 bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {status?.todayReplies || 0}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <ReplyIcon className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>

        {/* Uptime Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">运行时间</p>
              {statusLoading ? (
                <div className="h-6 w-24 bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-purple-400 mt-1">
                  {formatUptime(status?.uptime || 0)}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Spark Logs */}
        <Card title="最近火花记录" action={
          <a href="/spark" className="text-sm text-douyin-primary hover:underline">查看全部</a>
        }>
          <div className="space-y-3">
            {sparkLogs?.items?.slice(0, 5).map((log: SparkLog) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant={log.status === 'success' ? 'success' : 'error'}>
                    {log.status === 'success' ? '成功' : '失败'}
                  </Badge>
                  <span className="text-gray-300">{log.friendId}</span>
                </div>
                <span className="text-gray-500 text-sm">
                  {formatTime(log.sentAt)}
                </span>
              </div>
            ))}
            {(!sparkLogs?.items || sparkLogs.items.length === 0) && (
              <p className="text-gray-500 text-center py-4">暂无火花记录</p>
            )}
          </div>
        </Card>

        {/* Recent Reply Logs */}
        <Card title="最近回复记录" action={
          <a href="/reply" className="text-sm text-douyin-primary hover:underline">查看全部</a>
        }>
          <div className="space-y-3">
            {replyLogs?.items?.slice(0, 5).map((log: ReplyLog) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(log.status)}>
                    {getStatusText(log.status)}
                  </Badge>
                  <div>
                    <p className="text-gray-300 text-sm truncate max-w-[200px]">
                      {log.videoTitle || '视频分享'}
                    </p>
                    <p className="text-gray-500 text-xs truncate max-w-[200px]">
                      {log.aiReply}
                    </p>
                  </div>
                </div>
                <span className="text-gray-500 text-sm">
                  {formatTime(log.sentAt)}
                </span>
              </div>
            ))}
            {(!replyLogs?.items || replyLogs.items.length === 0) && (
              <p className="text-gray-500 text-center py-4">暂无回复记录</p>
            )}
          </div>
        </Card>
      </div>

      {/* Next Spark Time */}
      {status?.nextSparkTime && (
        <Card>
          <div className="flex items-center gap-3">
            <ClockIcon className="w-5 h-5 text-yellow-500" />
            <span className="text-gray-400">下次火花时间:</span>
            <span className="text-white font-medium">
              {new Date(status.nextSparkTime).toLocaleString('zh-CN')}
            </span>
          </div>
        </Card>
      )}

      {/* Error Alert */}
      {status?.lastError && (
        <Card className="border border-red-500/50 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertIcon className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">系统错误</p>
              <p className="text-gray-400 text-sm mt-1">{status.lastError}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Agent Status & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AgentStatus
          status={status?.loginStatus === 'active' ? 'idle' : 'error'}
          lastActivity={status?.uptime ? new Date(Date.now() - status.uptime * 1000).toISOString() : undefined}
          tasksCompleted={status?.todaySpark?.success ?? 0}
          tasksFailed={status?.todaySpark?.failed ?? 0}
        />

        <Card title="快捷操作" className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionButton
              icon={<SparkIcon className="w-5 h-5" />}
              label="发送火花"
              href="/spark"
            />
            <QuickActionButton
              icon={<ReplyIcon className="w-5 h-5" />}
              label="智能回复"
              href="/reply"
            />
            <QuickActionButton
              icon={<AgentIcon className="w-5 h-5" />}
              label="智能体"
              href="/agents"
            />
            <QuickActionButton
              icon={<ToolsIcon className="w-5 h-5" />}
              label="工具"
              href="/tools"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

// Helpers
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}天 ${hours}时`;
  if (hours > 0) return `${hours}时 ${mins}分`;
  return `${mins}分`;
}

function formatTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return d.toLocaleDateString('zh-CN');
}

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'sent': return 'success';
    case 'pending': return 'warning';
    case 'rejected': return 'error';
    default: return 'default';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'sent': return '已发送';
    case 'pending': return '待审批';
    case 'rejected': return '已拒绝';
    default: return status;
  }
}

// Icons
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ToolsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Quick Action Button Component
function QuickActionButton({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-douyin-primary/20 flex items-center justify-center mb-2 text-douyin-primary">
        {icon}
      </div>
      <span className="text-gray-300 text-sm">{label}</span>
    </a>
  );
}
