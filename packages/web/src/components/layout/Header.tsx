'use client';

import { useSystemStatus } from '@/lib/api';
import { StatusIndicator } from '@/components/ui';

export function Header() {
  const { data: status, isLoading } = useSystemStatus();

  return (
    <header className="h-16 bg-douyin-gray border-b border-gray-700 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-white">管理后台</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Login Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">登录状态:</span>
          {isLoading ? (
            <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
          ) : (
            <StatusIndicator
              status={status?.loginStatus === 'active' ? 'active' : 'inactive'}
              label={status?.loginStatus === 'active' ? '已登录' : '未登录'}
            />
          )}
        </div>

        {/* Today Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">今日火花:</span>
            <span className="text-green-400">{status?.todaySpark?.success || 0}</span>
            <span className="text-gray-500">/</span>
            <span className="text-red-400">{status?.todaySpark?.failed || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">今日回复:</span>
            <span className="text-blue-400">{status?.todayReplies || 0}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
