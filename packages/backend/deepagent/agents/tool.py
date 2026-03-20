"""
Tool Agent
工具代理 - 负责工具调用和执行
"""

from typing import Dict, Any, List, Optional
import importlib
import os
import json

from ..graph.state import AgentState


# 内置工具注册表
BUILTIN_TOOLS = {
    "get_friends": {
        "description": "获取抖音好友列表",
        "parameters": {},
        "module": "tools.douyin"
    },
    "check_spark": {
        "description": "检测好友的火花状态",
        "parameters": {
            "friend_id": {"type": "string", "required": True}
        },
        "module": "tools.douyin"
    },
    "send_message": {
        "description": "发送消息给好友",
        "parameters": {
            "friend_id": {"type": "string", "required": True},
            "message": {"type": "string", "required": True}
        },
        "module": "tools.douyin"
    },
    "screenshot": {
        "description": "截取当前页面截图",
        "parameters": {},
        "module": "tools.browser"
    },
    "browser_control": {
        "description": "控制浏览器操作",
        "parameters": {
            "action": {"type": "string", "required": True},
            "params": {"type": "object"}
        },
        "module": "tools.browser"
    },
}


class ToolRegistry:
    """工具注册表"""

    def __init__(self):
        self.tools = BUILTIN_TOOLS.copy()
        self.custom_tools = {}

    def register(self, name: str, config: Dict[str, Any]):
        """注册工具"""
        self.custom_tools[name] = config
        self.tools[name] = config

    def get(self, name: str) -> Optional[Dict[str, Any]]:
        """获取工具配置"""
        return self.tools.get(name)

    def list_tools(self) -> List[str]:
        """列出所有工具"""
        return list(self.tools.keys())

    def get_tool_schema(self, name: str) -> Dict[str, Any]:
        """获取工具的 JSON Schema"""
        tool = self.tools.get(name, {})
        return {
            "name": name,
            "description": tool.get("description", ""),
            "parameters": tool.get("parameters", {})
        }


# 全局工具注册表
tool_registry = ToolRegistry()


async def tool_node(state: AgentState) -> Dict[str, Any]:
    """工具调用节点"""
    tools_to_call = state.get("tools_to_call", [])

    if not tools_to_call:
        # 如果没有指定的工具，根据任务推断
        task_type = state.get("task_type", "")
        current_step = state.get("current_step", 0)
        plan = state.get("plan", [])

        if current_step < len(plan):
            current_action = plan[current_step].lower()

            if "好友" in current_action or "列表" in current_action:
                tools_to_call = [{"tool_name": "get_friends", "parameters": {}}]
            elif "火花" in current_action:
                tools_to_call = [{"tool_name": "check_spark", "parameters": {}}]
            elif "发送" in current_action or "消息" in current_action:
                message = state.get("generated_response", "")
                tools_to_call = [{"tool_name": "send_message", "parameters": {"message": message}}]

    # 执行工具调用
    results = []
    for tool_call in tools_to_call:
        tool_name = tool_call.get("tool_name")
        parameters = tool_call.get("parameters", {})

        tool_config = tool_registry.get(tool_name)
        if not tool_config:
            results.append({
                "tool_name": tool_name,
                "result": None,
                "error": f"工具 {tool_name} 不存在"
            })
            continue

        try:
            # 这里应该实际调用工具
            # 暂时返回模拟结果
            result = await execute_tool(tool_name, parameters, state)
            results.append({
                "tool_name": tool_name,
                "parameters": parameters,
                "result": result,
                "success": True
            })
        except Exception as e:
            results.append({
                "tool_name": tool_name,
                "parameters": parameters,
                "result": None,
                "error": str(e),
                "success": False
            })

    return {
        "tool_results": results,
        "current_step": state.get("current_step", 0) + 1,
        "observations": [str(r.get("result")) for r in results if r.get("success")],
        "messages": [{
            "role": "tool",
            "content": f"执行了 {len(results)} 个工具调用",
            "metadata": {"results": results}
        }]
    }


async def execute_tool(name: str, parameters: Dict[str, Any], state: AgentState) -> Any:
    """执行工具"""
    # 这里是工具执行的入口
    # 实际实现会在 tools/ 目录中

    if name == "get_friends":
        # 调用浏览器获取好友列表
        return {"friends": [], "count": 0}

    elif name == "check_spark":
        # 检测火花状态
        friend_id = parameters.get("friend_id")
        return {"friend_id": friend_id, "spark_status": "gray"}

    elif name == "send_message":
        # 发送消息
        friend_id = parameters.get("friend_id")
        message = parameters.get("message")
        return {"success": True, "message_id": "msg_123"}

    elif name == "screenshot":
        # 截图
        return {"screenshot_base64": ""}

    else:
        raise ValueError(f"未知工具: {name}")


class ToolAgent:
    """工具代理类"""

    def __init__(self):
        self.registry = tool_registry

    def register_tool(self, name: str, config: Dict[str, Any]):
        """注册自定义工具"""
        self.registry.register(name, config)

    async def call_tool(self, name: str, parameters: Dict[str, Any], state: AgentState) -> Any:
        """调用工具"""
        return await execute_tool(name, parameters, state)

    def list_available_tools(self) -> List[str]:
        """列出可用工具"""
        return self.registry.list_tools()
