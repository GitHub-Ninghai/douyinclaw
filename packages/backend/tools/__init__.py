"""
Tools System
四层工具架构
"""

from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
from abc import ABC, abstractmethod
import asyncio
import inspect


@dataclass
class ToolContext:
    """工具执行上下文"""
    user_id: str
    session_id: str
    workspace: str
    browser_session: Optional[Any] = None


@dataclass
class ToolResult:
    """工具执行结果"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseTool(ABC):
    """工具基类"""

    name: str = ""
    description: str = ""
    parameters: Dict[str, Any] = {}

    @abstractmethod
    async def execute(self, params: Dict[str, Any], context: ToolContext) -> ToolResult:
        """执行工具"""
        pass

    def get_schema(self) -> Dict[str, Any]:
        """获取工具 Schema"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }


def tool(func: Callable) -> Callable:
    """
    工具装饰器
    用于将普通函数转换为可被智能体调用的工具

    使用示例:
    @tool
    def my_custom_tool(param1: str, param2: int = 0) -> dict:
        '''工具描述'''
        return {"result": "ok"}
    """
    # 提取函数信息
    sig = inspect.signature(func)
    doc = func.__doc__ or ""

    # 构建 parameters schema
    parameters = {
        "type": "object",
        "properties": {},
        "required": []
    }

    for param_name, param in sig.parameters.items():
        param_type = "string"  # 默认类型
        if param.annotation == int:
            param_type = "integer"
        elif param.annotation == float:
            param_type = "number"
        elif param.annotation == bool:
            param_type = "boolean"
        elif param.annotation == list:
            param_type = "array"
        elif param.annotation == dict:
            param_type = "object"

        parameters["properties"][param_name] = {"type": param_type}

        if param.default == inspect.Parameter.empty:
            parameters["required"].append(param_name)

    # 存储元数据
    func._tool_metadata = {
        "name": func.__name__,
        "description": doc,
        "parameters": parameters
    }

    return func


class ToolManager:
    """工具管理器"""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._custom_tools: Dict[str, Callable] = {}

    def register(self, tool: BaseTool):
        """注册内置工具"""
        self._tools[tool.name] = tool

    def register_custom(self, func: Callable):
        """注册自定义工具 (使用 @tool 装饰器的函数)"""
        if hasattr(func, '_tool_metadata'):
            name = func._tool_metadata['name']
            self._custom_tools[name] = func

    async def execute(
        self,
        tool_name: str,
        params: Dict[str, Any],
        context: ToolContext
    ) -> ToolResult:
        """执行工具"""
        # 先查找内置工具
        if tool_name in self._tools:
            tool = self._tools[tool_name]
            return await tool.execute(params, context)

        # 再查找自定义工具
        if tool_name in self._custom_tools:
            func = self._custom_tools[tool_name]
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(**params)
                else:
                    result = func(**params)
                return ToolResult(success=True, data=result)
            except Exception as e:
                return ToolResult(success=False, error=str(e))

        return ToolResult(success=False, error=f"工具 {tool_name} 不存在")

    def list_tools(self) -> list:
        """列出所有工具"""
        tools = []
        for name, tool in self._tools.items():
            tools.append(tool.get_schema())
        for name, func in self._custom_tools.items():
            tools.append(func._tool_metadata)
        return tools

    def load_custom_tools(self, tools_dir: str):
        """从目录加载自定义工具"""
        import os
        import importlib.util

        if not os.path.exists(tools_dir):
            return

        for filename in os.listdir(tools_dir):
            if filename.endswith('.py') and not filename.startswith('_'):
                filepath = os.path.join(tools_dir, filename)
                spec = importlib.util.spec_from_file_location(filename[:-3], filepath)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                # 查找所有使用 @tool 装饰器的函数
                for name in dir(module):
                    obj = getattr(module, name)
                    if callable(obj) and hasattr(obj, '_tool_metadata'):
                        self.register_custom(obj)


# 全局工具管理器
tool_manager = ToolManager()


__all__ = [
    'BaseTool',
    'ToolContext',
    'ToolResult',
    'ToolManager',
    'tool',
    'tool_manager',
]
