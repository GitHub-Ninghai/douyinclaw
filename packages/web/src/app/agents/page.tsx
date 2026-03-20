'use client';

import { useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { executeAgentTask, type AgentExecuteResponse } from '@/lib/api';

interface TaskHistory {
  id: string;
  task: string;
  status: string;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
}

export default function AgentsPage() {
  const [task, setTask] = useState('');
  const [executing, setExecuting] = useState(false);
  const [currentTask, setCurrentTask] = useState<AgentExecuteResponse | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [context, setContext] = useState<Record<string, unknown>>({});

  const quickTasks = [
    { label: '发送火花给所有好友', value: '发送火花给所有启用的好友' },
    { label: '检查新消息', value: '检查是否有新消息需要回复' },
    { label: '同步好友列表', value: '从抖音同步好友列表' },
    { label: '检查登录状态', value: '检查当前抖音登录状态是否有效' },
  ];

  const handleExecute = async () => {
    if (!task.trim()) return;

    setExecuting(true);
    try {
      const response = await executeAgentTask({
        task: task.trim(),
        context: Object.keys(context).length > 0 ? context : undefined,
      });

      setCurrentTask(response);

      // 添加到历史记录
      setTaskHistory((prev) => [
        {
          id: response.taskId,
          task: task.trim(),
          status: response.status,
          result: response.result,
          error: response.error,
          createdAt: new Date(),
        },
        ...prev.slice(0, 19), // 保留最近 20 条
      ]);

      setTask('');
      setContext({});
    } catch (error) {
      console.error('Failed to execute task:', error);
    } finally {
      setExecuting(false);
    }
  };

  const handleQuickTask = (taskText: string) => {
    setTask(taskText);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">智能体任务</h1>
        <p className="text-gray-400 mt-1">使用自然语言描述任务，智能体会自动执行</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Input Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Input */}
          <Card title="创建任务">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  任务描述
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="例如: 发送火花给所有好友"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-douyin-primary resize-none"
                  rows={3}
                />
              </div>

              {/* Context JSON Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  上下文参数 (JSON, 可选)
                </label>
                <textarea
                  value={JSON.stringify(context, null, 2)}
                  onChange={(e) => {
                    try {
                      setContext(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder='{"friendId": "xxx"}'
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-douyin-primary font-mono text-sm resize-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleExecute} loading={executing} disabled={!task.trim()}>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  执行任务
                </Button>
                <Button variant="ghost" onClick={() => { setTask(''); setContext({}); }}>
                  清空
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Tasks */}
          <Card title="快捷任务">
            <div className="grid grid-cols-2 gap-3">
              {quickTasks.map((qt) => (
                <button
                  key={qt.value}
                  onClick={() => handleQuickTask(qt.value)}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-douyin-primary/20 flex items-center justify-center flex-shrink-0">
                    <ZapIcon className="w-4 h-4 text-douyin-primary" />
                  </div>
                  <span className="text-gray-300 text-sm">{qt.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Current Task Status */}
          {currentTask && (
            <Card title="当前任务状态">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">任务 ID</span>
                  <code className="text-white bg-gray-700 px-2 py-1 rounded text-sm">
                    {currentTask.taskId}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">状态</span>
                  <TaskStatusBadge status={currentTask.status} />
                </div>
                {currentTask.result && (
                  <div>
                    <span className="text-gray-400 block mb-2">执行结果</span>
                    <pre className="bg-gray-700/50 rounded-lg p-3 text-sm text-gray-300 overflow-auto max-h-40">
                      {JSON.stringify(currentTask.result, null, 2)}
                    </pre>
                  </div>
                )}
                {currentTask.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{currentTask.error}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Task History */}
        <div className="lg:col-span-1">
          <Card title="任务历史">
            <div className="space-y-3 max-h-[600px] overflow-auto">
              {taskHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无任务历史</p>
              ) : (
                taskHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-700/30 rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm line-clamp-2">{item.task}</p>
                      <TaskStatusBadge status={item.status} />
                    </div>
                    <p className="text-gray-500 text-xs">
                      {formatTime(item.createdAt)}
                    </p>
                    {item.error && (
                      <p className="text-red-400 text-xs truncate">{item.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function TaskStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    completed: 'success',
    running: 'info',
    pending: 'warning',
    failed: 'error',
  };
  const labels: Record<string, string> = {
    completed: '已完成',
    running: '执行中',
    pending: '等待中',
    failed: '失败',
  };
  return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
}

// Helper
function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN');
}

// Icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
