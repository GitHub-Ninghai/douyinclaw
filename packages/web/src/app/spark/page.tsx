'use client';

import { useState } from 'react';
import { useFriends, useSparkLogs, toggleSpark, sendSparkNow, sendSparkToAll } from '@/lib/api';
import { Card, Button, Table, Toggle, Badge, Pagination } from '@/components/ui';
import type { Friend, SparkLog } from '@douyinclaw/shared';

export default function SparkPage() {
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  const { data: friendsData, isLoading: friendsLoading, mutate: mutateFriends } = useFriends();
  const { data: logsData, isLoading: logsLoading, mutate: mutateLogs } = useSparkLogs(page, 10);

  const friends = friendsData?.items || [];
  const logs = logsData?.items || [];
  const totalLogs = logsData?.total || 0;

  const handleToggleSpark = async (friendId: string, enabled: boolean) => {
    try {
      await toggleSpark(friendId, enabled);
      mutateFriends();
    } catch (error) {
      console.error('Failed to toggle spark:', error);
    }
  };

  const handleSendSpark = async (friendId: string) => {
    setSending(friendId);
    try {
      await sendSparkNow(friendId);
      mutateLogs();
    } catch (error) {
      console.error('Failed to send spark:', error);
    } finally {
      setSending(null);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      await sendSparkToAll();
      mutateLogs();
      mutateFriends();
    } catch (error) {
      console.error('Failed to send all sparks:', error);
    } finally {
      setSendingAll(false);
    }
  };

  const friendColumns = [
    {
      key: 'nickname',
      title: '好友昵称',
      render: (friend: Friend) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-white">{friend.nickname}</span>
        </div>
      ),
    },
    {
      key: 'sparkDays',
      title: '火花天数',
      render: (friend: Friend) => (
        <div className="flex items-center gap-2">
          <FireIcon className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 font-medium">{friend.sparkDays} 天</span>
        </div>
      ),
    },
    {
      key: 'lastInteraction',
      title: '最近互动',
      render: (friend: Friend) => (
        <span className="text-gray-400">
          {friend.lastInteraction
            ? formatDate(friend.lastInteraction)
            : '暂无记录'}
        </span>
      ),
    },
    {
      key: 'isSparkEnabled',
      title: '自动续火',
      render: (friend: Friend) => (
        <Toggle
          checked={friend.isSparkEnabled}
          onChange={(checked) => handleToggleSpark(friend.id, checked)}
        />
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (friend: Friend) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleSendSpark(friend.id)}
          loading={sending === friend.id}
        >
          立即发送
        </Button>
      ),
    },
  ];

  const logColumns = [
    {
      key: 'friendName',
      title: '好友',
      render: (log: SparkLog) => (
        <span className="text-white">{log.friendId}</span>
      ),
    },
    {
      key: 'message',
      title: '消息内容',
      render: (log: SparkLog) => (
        <span className="text-gray-300 truncate max-w-[300px] block">
          {log.message}
        </span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (log: SparkLog) => (
        <Badge variant={log.status === 'success' ? 'success' : 'error'}>
          {log.status === 'success' ? '成功' : '失败'}
        </Badge>
      ),
    },
    {
      key: 'sentAt',
      title: '发送时间',
      render: (log: SparkLog) => (
        <span className="text-gray-400">
          {formatDateTime(log.sentAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">火花管理</h1>
          <p className="text-gray-400 mt-1">管理抖音好友火花续期</p>
        </div>
        <Button onClick={handleSendAll} loading={sendingAll}>
          一键发送全部
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">好友总数</p>
              <p className="text-xl font-bold text-white">{friends.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckIcon className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">已启用</p>
              <p className="text-xl font-bold text-green-400">
                {friends.filter((f: Friend) => f.isSparkEnabled).length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <FireIcon className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">平均火花</p>
              <p className="text-xl font-bold text-yellow-400">
                {friends.length > 0
                  ? Math.round(
                      friends.reduce((sum: number, f: Friend) => sum + f.sparkDays, 0) /
                        friends.length
                    )
                  : 0}{' '}
                天
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">今日发送</p>
              <p className="text-xl font-bold text-purple-400">{totalLogs}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Friends Table */}
      <Card title="好友列表" action={
        <Button variant="ghost" size="sm" onClick={() => mutateFriends()}>
          <RefreshIcon className="w-4 h-4 mr-2" />
          刷新
        </Button>
      }>
        <Table
          columns={friendColumns}
          data={friends}
          keyExtractor={(friend) => friend.id}
          loading={friendsLoading}
          emptyMessage="暂无好友数据"
        />
      </Card>

      {/* Spark Logs */}
      <Card title="火花记录">
        <Table
          columns={logColumns}
          data={logs}
          keyExtractor={(log) => log.id}
          loading={logsLoading}
          emptyMessage="暂无火花记录"
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
  );
}

// Helpers
function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN');
}

function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN');
}

// Icons
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
