'use client';

import { Badge } from './ui';

export interface TaskCardProps {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  total?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  onClick?: () => void;
}

export function TaskCard({
  title,
  status,
  progress,
  total,
  startedAt,
  completedAt,
  error,
  onClick,
}: TaskCardProps) {
  const progressPercent = progress !== undefined && total !== undefined && total > 0
    ? Math.round((progress / total) * 100)
    : 0;

  const statusVariants = {
    pending: 'warning',
    running: 'info',
    completed: 'success',
    failed: 'error',
  } as const;

  const statusLabels = {
    pending: '等待中',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-douyin-gray rounded-lg p-4 transition-all ${
        onClick ? 'cursor-pointer hover:ring-2 hover:ring-douyin-primary/50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-white font-medium line-clamp-1">{title}</h4>
        <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
      </div>

      {status === 'running' && progress !== undefined && total !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">进度</span>
            <span className="text-white">{progress} / {total}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-douyin-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded p-2">
          <p className="text-red-400 text-sm line-clamp-2">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-400">
        {startedAt && (
          <span>开始: {formatTime(startedAt)}</span>
        )}
        {completedAt && (
          <span>完成: {formatTime(completedAt)}</span>
        )}
      </div>
    </div>
  );
}

function formatTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
