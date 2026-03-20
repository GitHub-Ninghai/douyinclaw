'use client';

import { useState } from 'react';
import { useTools, executeTool } from '@/lib/api';
import { Card, Button, Input, Badge } from '@/components/ui';
import type { ToolInfo, ToolParameter } from '@/lib/api';

export default function ToolsPage() {
  const { data: tools, isLoading } = useTools();
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data: unknown; error?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // 获取所有分类
  const categories = tools
    ? ['all', ...Array.from(new Set(tools.map((t) => t.category)))]
    : ['all'];

  // 过滤工具
  const filteredTools = tools?.filter((tool) => {
    const matchesSearch = searchQuery
      ? tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory =
      categoryFilter === 'all' || tool.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTool = (tool: ToolInfo) => {
    setSelectedTool(tool);
    // 设置默认参数值
    const defaultParams: Record<string, unknown> = {};
    tool.parameters.forEach((p) => {
      if (p.default !== undefined) {
        defaultParams[p.name] = p.default;
      }
    });
    setParams(defaultParams);
    setResult(null);
  };

  const handleExecute = async () => {
    if (!selectedTool) return;

    setExecuting(true);
    setResult(null);
    try {
      const response = await executeTool(selectedTool.name, params);
      setResult({
        success: response.success,
        data: response.result,
        error: response.error,
      });
    } catch (error) {
      setResult({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : '执行失败',
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleParamChange = (name: string, value: unknown) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">工具管理</h1>
        <p className="text-gray-400 mt-1">查看和执行系统工具</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tools List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search and Filter */}
          <div className="space-y-3">
            <Input
              placeholder="搜索工具..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    categoryFilter === cat
                      ? 'bg-douyin-primary text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {cat === 'all' ? '全部' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tools List */}
          <Card className="!p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-700/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredTools?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">没有找到匹配的工具</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-auto">
                {filteredTools?.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => handleSelectTool(tool)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTool?.name === tool.name
                        ? 'bg-douyin-primary/20 border border-douyin-primary/50'
                        : 'bg-gray-700/30 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{tool.name}</span>
                      <Badge variant="default" className="text-xs">{tool.category}</Badge>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{tool.description}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Tool Detail & Execute */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTool ? (
            <>
              {/* Tool Info */}
              <Card title="工具详情">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedTool.name}</h3>
                    <p className="text-gray-400 mt-1">{selectedTool.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="info">{selectedTool.category}</Badge>
                    <Badge variant="default">{selectedTool.parameters.length} 个参数</Badge>
                  </div>
                </div>
              </Card>

              {/* Parameters */}
              {selectedTool.parameters.length > 0 && (
                <Card title="参数配置">
                  <div className="space-y-4">
                    {selectedTool.parameters.map((param) => (
                      <ParamInput
                        key={param.name}
                        param={param}
                        value={params[param.name]}
                        onChange={(value) => handleParamChange(param.name, value)}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {/* Execute Button */}
              <div className="flex items-center gap-3">
                <Button onClick={handleExecute} loading={executing}>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  执行工具
                </Button>
                <Button variant="ghost" onClick={() => { setParams({}); setResult(null); }}>
                  重置参数
                </Button>
              </div>

              {/* Result */}
              {result && (
                <Card title="执行结果">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? 'success' : 'error'}>
                        {result.success ? '成功' : '失败'}
                      </Badge>
                    </div>
                    {result.error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-400 text-sm">{result.error}</p>
                      </div>
                    )}
                    {result.data !== null && result.data !== undefined && (
                      <pre className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-300 overflow-auto max-h-80">
                        {typeof result.data === 'string'
                          ? result.data
                          : JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center">
                <ToolIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">选择一个工具查看详情并执行</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Parameter Input Component
function ParamInput({
  param,
  value,
  onChange,
}: {
  param: ToolParameter;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputId = `param-${param.name}`;

  if (param.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor={inputId} className="text-white font-medium">{param.name}</label>
          <p className="text-gray-400 text-sm">{param.description}</p>
        </div>
        <button
          id={inputId}
          onClick={() => onChange(!value)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            value ? 'bg-douyin-primary' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              value ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>
    );
  }

  if (param.type === 'number') {
    return (
      <div>
        <label htmlFor={inputId} className="block text-white font-medium mb-1">
          {param.name}
          {param.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <p className="text-gray-400 text-sm mb-2">{param.description}</p>
        <Input
          id={inputId}
          type="number"
          value={value as number ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={param.default !== undefined ? String(param.default) : ''}
        />
      </div>
    );
  }

  // Default: string or JSON
  return (
    <div>
      <label htmlFor={inputId} className="block text-white font-medium mb-1">
        {param.name}
        {param.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <p className="text-gray-400 text-sm mb-2">{param.description}</p>
      <textarea
        id={inputId}
        value={value as string ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          // Try to parse as JSON if it looks like JSON
          if (val.trim().startsWith('{') || val.trim().startsWith('[')) {
            try {
              onChange(JSON.parse(val));
            } catch {
              onChange(val);
            }
          } else {
            onChange(val);
          }
        }}
        placeholder={param.default !== undefined ? String(param.default) : ''}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-douyin-primary resize-none"
        rows={2}
      />
    </div>
  );
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

function ToolIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
