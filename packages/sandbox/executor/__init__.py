"""
Code Executor
代码执行器 - 在沙箱中安全执行代码
"""

import asyncio
import os
import tempfile
import subprocess
from typing import Dict, Any, Optional


class CodeExecutor:
    """代码执行器"""

    def __init__(self, workspace: str = "/workspace"):
        self.workspace = workspace
        os.makedirs(workspace, exist_ok=True)

    async def execute(
        self,
        code: str,
        language: str = "python",
        timeout: int = 30
    ) -> Dict[str, Any]:
        """执行代码"""
        if not code:
            return {"success": False, "error": "代码为空"}

        if language == "python":
            return await self._execute_python(code, timeout)
        elif language == "javascript":
            return await self._execute_javascript(code, timeout)
        elif language == "shell":
            return await self._execute_shell(code, timeout)
        else:
            return {"success": False, "error": f"不支持的语言: {language}"}

    async def _execute_python(self, code: str, timeout: int) -> Dict[str, Any]:
        """执行 Python 代码"""
        # 创建临时文件
        temp_file = os.path.join(self.workspace, "_temp_exec.py")

        try:
            # 写入代码
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(code)

            # 执行
            proc = await asyncio.create_subprocess_exec(
                'python3', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.workspace
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=timeout
                )

                return {
                    "success": proc.returncode == 0,
                    "stdout": stdout.decode('utf-8'),
                    "stderr": stderr.decode('utf-8'),
                    "return_code": proc.returncode
                }

            except asyncio.TimeoutError:
                proc.kill()
                return {"success": False, "error": "执行超时"}

        except Exception as e:
            return {"success": False, "error": str(e)}

        finally:
            # 清理临时文件
            if os.path.exists(temp_file):
                os.remove(temp_file)

    async def _execute_javascript(self, code: str, timeout: int) -> Dict[str, Any]:
        """执行 JavaScript 代码"""
        temp_file = os.path.join(self.workspace, "_temp_exec.js")

        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(code)

            proc = await asyncio.create_subprocess_exec(
                'node', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.workspace
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=timeout
                )

                return {
                    "success": proc.returncode == 0,
                    "stdout": stdout.decode('utf-8'),
                    "stderr": stderr.decode('utf-8'),
                    "return_code": proc.returncode
                }

            except asyncio.TimeoutError:
                proc.kill()
                return {"success": False, "error": "执行超时"}

        except Exception as e:
            return {"success": False, "error": str(e)}

        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)

    async def _execute_shell(self, command: str, timeout: int) -> Dict[str, Any]:
        """执行 Shell 命令"""
        # 安全检查
        dangerous_commands = ['rm -rf', 'sudo', 'chmod 777', 'mkfs', 'dd if=']
        for dc in dangerous_commands:
            if dc in command:
                return {"success": False, "error": f"禁止执行危险命令: {dc}"}

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.workspace
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=timeout
                )

                return {
                    "success": proc.returncode == 0,
                    "stdout": stdout.decode('utf-8'),
                    "stderr": stderr.decode('utf-8'),
                    "return_code": proc.returncode
                }

            except asyncio.TimeoutError:
                proc.kill()
                return {"success": False, "error": "执行超时"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def read_file(self, path: str) -> Dict[str, Any]:
        """读取文件"""
        full_path = os.path.join(self.workspace, path)

        # 安全检查
        if not os.path.abspath(full_path).startswith(os.path.abspath(self.workspace)):
            return {"success": False, "error": "路径不在工作空间内"}

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return {"success": True, "content": content}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def write_file(self, path: str, content: str) -> Dict[str, Any]:
        """写入文件"""
        full_path = os.path.join(self.workspace, path)

        # 安全检查
        if not os.path.abspath(full_path).startswith(os.path.abspath(self.workspace)):
            return {"success": False, "error": "路径不在工作空间内"}

        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"success": True, "path": path}
        except Exception as e:
            return {"success": False, "error": str(e)}
