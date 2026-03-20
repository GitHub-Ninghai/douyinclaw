'use client';

import { StatusIndicator } from './ui';

export interface AgentStatusProps {
  status: 'idle' | 'busy' | 'error';
  currentTask?: string;
  lastActivity?: string;
  tasksCompleted?: number;
  tasksFailed?: number;
}

export function AgentStatus({
  status,
  currentTask,
  lastActivity,
  tasksCompleted = 0,
  tasksFailed = 0,
}: AgentStatusProps) {
  const statusConfig = {
    idle: { label: '空闲', color: 'text-green-400', bgColor: 'bg-green-400/20' },
    busy: { label: '忙碌', color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
    error: { label: '错误', color: 'text-red-400', bgColor: 'bg-red-400/20' },
  };

  const config = statusConfig[status];

  return (
    <div className="bg-douyin-gray rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
          <AgentIcon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div>
          <h4 className="text-white font-medium">智能体状态</h4>
          <StatusIndicator
            status={status === 'error' ? 'error' : status === 'busy' ? 'active' : 'inactive'}
            label={config.label}
          />
        </div>
      </div>

      {currentTask && (
        <div className="mb-3">
          <p className="text-gray-400 text-sm mb-1">当前任务</p>
          <p className="text-white text-sm bg-gray-700/50 rounded p-2 line-clamp-2">
            {currentTask}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-700/30 rounded p-2">
          <p className="text-gray-400">已完成任务</p>
          <p className="text-green-400 font-bold text-lg">{tasksCompleted}</p>
        </div>
        <div className="bg-gray-700/30 rounded p-2">
          <p className="text-gray-400">失败任务</p>
          <p className="text-red-400 font-bold text-lg">{tasksFailed}</p>
        </div>
      </div>

      {lastActivity && (
        <p className="text-gray-500 text-xs mt-3">
          最后活动: {formatTime(lastActivity)}
        </p>
      )}
    </div>
  );
}

function formatTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  if (mins < 1440) return `${Math.floor(mins / 60)} 小时前`;
  return d.toLocaleDateString('zh-CN');
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
