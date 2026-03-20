"""
Sandbox Tools
沙箱工具集 - Layer 3
"""

from typing import Dict, Any
import os
import subprocess
import asyncio
from .base import BaseTool, ToolContext, ToolResult


class ReadFileTool(BaseTool):
    """读取文件工具"""

    name = "read_file"
    description = "从工作空间读取文件内容"
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "文件路径 (相对于工作空间)"
            }
        },
        "required": ["path"]
    }

    async def execute(self, params: Dict[str, Any], context: ToolContext) -> ToolResult:
        """执行读取文件"""
        file_path = params.get("path")
        if not file_path:
            return ToolResult(success=False, error="缺少文件路径")

        # 安全检查：确保路径在工作空间内
        full_path = os.path.join(context.workspace, file_path)
        if not os.path.abspath(full_path).startswith(os.path.abspath(context.workspace)):
            return ToolResult(success=False, error="路径不在工作空间内")

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()

            return ToolResult(
                success=True,
                data={
                    "path": file_path,
                    "content": content,
                    "size": len(content)
                }
            )

        except Exception as e:
            return ToolResult(success=False, error=str(e))


class WriteFileTool(BaseTool):
    """写入文件工具"""

    name = "write_file"
    description = "将内容写入工作空间的文件"
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "文件路径 (相对于工作空间)"
            },
            "content": {
                "type": "string",
                "description": "文件内容"
            }
        },
        "required": ["path", "content"]
    }

    async def execute(self, params: Dict[str, Any], context: ToolContext) -> ToolResult:
        """执行写入文件"""
        file_path = params.get("path")
        content = params.get("content")

        if not file_path or content is None:
            return ToolResult(success=False, error="缺少必要参数")

        # 安全检查
        full_path = os.path.join(context.workspace, file_path)
        if not os.path.abspath(full_path).startswith(os.path.abspath(context.workspace)):
            return ToolResult(success=False, error="路径不在工作空间内")

        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)

            return ToolResult(
                success=True,
                data={
                    "path": file_path,
                    "size": len(content),
                    "created": True
                }
            )

        except Exception as e:
            return ToolResult(success=False, error=str(e))


class ExecuteCodeTool(BaseTool):
    """执行代码工具"""

    name = "execute_code"
    description = "在沙箱中执行 Python 代码"
    parameters = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "要执行的 Python 代码"
            },
            "timeout": {
                "type": "integer",
                "description": "超时时间 (秒)",
                "default": 30
            }
        },
        "required": ["code"]
    }

    async def execute(self, params: Dict[str, Any], context: ToolContext) -> ToolResult:
        """执行代码"""
        code = params.get("code")
        timeout = params.get("timeout", 30)

        if not code:
            return ToolResult(success=False, error="缺少代码")

        try:
            # 在实际实现中，应该使用 Docker 容器隔离执行
            # 这里简化为直接执行（仅用于演示）

            # 创建临时文件
            temp_file = os.path.join(context.workspace, "_temp_exec.py")
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(code)

            # 执行
            proc = await asyncio.create_subprocess_exec(
                'python', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=context.workspace
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=timeout
                )

                return ToolResult(
                    success=proc.returncode == 0,
                    data={
                        "stdout": stdout.decode('utf-8'),
                        "stderr": stderr.decode('utf-8'),
                        "return_code": proc.returncode
                    }
                )

            except asyncio.TimeoutError:
                proc.kill()
                return ToolResult(success=False, error="执行超时")

        except Exception as e:
            return ToolResult(success=False, error=str(e))


class ShellCommandTool(BaseTool):
    """Shell 命令工具"""

    name = "shell_command"
    description = "在沙箱中执行 Shell 命令"
    parameters = {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "要执行的 Shell 命令"
            },
            "timeout": {
                "type": "integer",
                "description": "超时时间 (秒)",
                "default": 30
            }
        },
        "required": ["command"]
    }

    async def execute(self, params: Dict[str, Any], context: ToolContext) -> ToolResult:
        """执行 Shell 命令"""
        command = params.get("command")
        timeout = params.get("timeout", 30)

        if not command:
            return ToolResult(success=False, error="缺少命令")

        # 安全检查：禁止危险命令
        dangerous_commands = ['rm -rf', 'sudo', 'chmod 777', '> /dev/']
        for dc in dangerous_commands:
            if dc in command:
                return ToolResult(success=False, error=f"禁止执行危险命令: {dc}")

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=context.workspace
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=timeout
                )

                return ToolResult(
                    success=proc.returncode == 0,
                    data={
                        "stdout": stdout.decode('utf-8'),
                        "stderr": stderr.decode('utf-8'),
                        "return_code": proc.returncode
                    }
                )

            except asyncio.TimeoutError:
                proc.kill()
                return ToolResult(success=False, error="执行超时")

        except Exception as e:
            return ToolResult(success=False, error=str(e))


# 注册沙箱工具
def register_sandbox_tools(manager):
    """注册沙箱工具"""
    manager.register(ReadFileTool())
    manager.register(WriteFileTool())
    manager.register(ExecuteCodeTool())
    manager.register(ShellCommandTool())
