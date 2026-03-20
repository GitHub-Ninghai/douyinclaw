'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Badge } from './ui';

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  source?: string;
}

export interface LogViewerProps {
  logs: LogEntry[];
  title?: string;
  maxHeight?: string;
  autoScroll?: boolean;
  onClear?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function LogViewer({
  logs,
  title = '实时日志',
  maxHeight = '400px',
  autoScroll = true,
  onClear,
  onRefresh,
  loading,
}: LogViewerProps) {
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 过滤日志
  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = searchQuery
      ? log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.source?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      : true;
    return matchesFilter && matchesSearch;
  });

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && !isPaused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll, isPaused]);

  const levelConfig = {
    info: { label: 'INFO', variant: 'info' as const, color: 'text-blue-400' },
    warn: { label: 'WARN', variant: 'warning' as const, color: 'text-yellow-400' },
    error: { label: 'ERROR', variant: 'error' as const, color: 'text-red-400' },
    debug: { label: 'DEBUG', variant: 'default' as const, color: 'text-gray-400' },
  };

  return (
    <div className="bg-douyin-gray rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-white font-medium">{title}</h3>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} loading={loading}>
              <RefreshIcon className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <PlayIcon className="w-4 h-4" />
            ) : (
              <PauseIcon className="w-4 h-4" />
            )}
          </Button>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-1">
          {(['all', 'info', 'warn', 'error', 'debug'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filter === level
                  ? 'bg-douyin-primary text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="搜索日志..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-douyin-primary"
        />
      </div>

      {/* Log Content */}
      <div
        ref={containerRef}
        className="font-mono text-sm overflow-auto p-3 space-y-1"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无日志</p>
        ) : (
          filteredLogs.map((log) => {
            const config = levelConfig[log.level];
            return (
              <div
                key={log.id}
                className="flex items-start gap-2 py-1 hover:bg-gray-700/30 px-2 rounded"
              >
                <span className="text-gray-500 text-xs flex-shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
                <Badge variant={config.variant} className="flex-shrink-0 text-xs">
                  {config.label}
                </Badge>
                {log.source && (
                  <span className="text-purple-400 text-xs flex-shrink-0">
                    [{log.source}]
                  </span>
                )}
                <span className={`${config.color} break-all`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700 text-xs text-gray-400">
        <span>共 {filteredLogs.length} 条日志</span>
        {isPaused && <span className="text-yellow-400">已暂停</span>}
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Icons
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
