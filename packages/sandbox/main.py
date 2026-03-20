"""
Sandbox Service Main
浏览器沙箱服务入口
"""

import asyncio
import os
import sys

# 添加当前目录到 path，支持直接运行
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from browser import BrowserManager
from executor import CodeExecutor
from communication import ConnectionManager

app = FastAPI(title="DouyinClaw Sandbox Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局管理器
browser_manager = BrowserManager()
code_executor = CodeExecutor(workspace="/workspace")
connection_manager = ConnectionManager()


@app.on_event("startup")
async def startup():
    """启动时初始化浏览器"""
    await browser_manager.initialize()
    print("✅ Sandbox Service started")


@app.on_event("shutdown")
async def shutdown():
    """关闭时清理资源"""
    await browser_manager.close()
    print("🛑 Sandbox Service stopped")


# ====================
# REST API
# ====================

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "browser": browser_manager.is_ready,
        "workspace": "/workspace"
    }


@app.post("/browser/screenshot")
async def take_screenshot():
    """截取当前页面"""
    screenshot = await browser_manager.screenshot()
    return {"screenshot": screenshot}


@app.post("/browser/action")
async def execute_action(action: dict):
    """执行浏览器操作"""
    result = await browser_manager.execute_action(action)
    return result


@app.post("/code/execute")
async def execute_code(code: dict):
    """执行代码"""
    result = await code_executor.execute(
        code.get("code"),
        language=code.get("language", "python"),
        timeout=code.get("timeout", 30)
    )
    return result


# ====================
# WebSocket API
# ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 连接"""
    await connection_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()

            # 处理不同类型的请求
            message_type = data.get("type")

            if message_type == "browser_action":
                result = await browser_manager.execute_action(data.get("action", {}))
                await websocket.send_json({
                    "type": "browser_result",
                    "result": result
                })

            elif message_type == "screenshot":
                screenshot = await browser_manager.screenshot()
                await websocket.send_json({
                    "type": "screenshot_result",
                    "screenshot": screenshot
                })

            elif message_type == "execute_code":
                result = await code_executor.execute(
                    data.get("code"),
                    language=data.get("language", "python")
                )
                await websocket.send_json({
                    "type": "code_result",
                    "result": result
                })

            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9222)
