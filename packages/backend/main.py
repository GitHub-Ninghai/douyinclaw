"""
Backend Service Main
后端服务入口
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import motor.motor_asyncio
from datetime import datetime

# 导入智能体引擎
from deepagent import create_agent_graph, create_initial_state

# 导入工具系统
from tools import tool_manager, ToolContext
from tools.douyin import register_douyin_tools
from tools.browser import register_browser_tools
from tools.sandbox import register_sandbox_tools

# 注册工具
register_douyin_tools(tool_manager)
register_browser_tools(tool_manager)
register_sandbox_tools(tool_manager)

# 创建应用
app = FastAPI(
    title="DouyinClaw Backend",
    description="抖音社交助手后端服务",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据库连接
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/douyinclaw")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
db = client.get_database()


# ====================
# Models
# ====================

class TaskRequest(BaseModel):
    task: str
    task_type: str = "spark"
    user_id: str = "default"


class MessageResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


# ====================
# Health Check
# ====================

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "services": {
            "database": "connected",
            "tools": len(tool_manager.list_tools())
        }
    }


# ====================
# Agent API
# ====================

@app.post("/api/agent/execute")
async def execute_agent_task(request: TaskRequest):
    """执行智能体任务"""
    try:
        # 创建初始状态
        state = create_initial_state(
            user_id=request.user_id,
            task=request.task,
            task_type=request.task_type
        )

        # 创建智能体图
        graph = create_agent_graph()

        # 执行
        result = await graph.ainvoke(state)

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ====================
# Spark API
# ====================

@app.post("/api/spark/start")
async def start_spark_task():
    """启动续火花任务"""
    # 创建任务记录
    task = {
        "type": "spark",
        "status": "running",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    result = await db.tasks.insert_one(task)

    return {
        "success": True,
        "task_id": str(result.inserted_id)
    }


@app.get("/api/spark/status/{task_id}")
async def get_spark_status(task_id: str):
    """获取续火花任务状态"""
    from bson import ObjectId

    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "success": True,
        "data": task
    }


@app.get("/api/spark/friends")
async def get_friends():
    """获取好友列表"""
    friends = await db.friends.find().to_list(100)
    return {
        "success": True,
        "data": friends
    }


# ====================
# Reply API
# ====================

@app.post("/api/reply/generate")
async def generate_reply(message: str, context: Optional[str] = None):
    """生成回复"""
    from deepagent.agents.chat import ChatAgent

    agent = ChatAgent()
    reply = await agent.generate_reply([message])

    return {
        "success": True,
        "reply": reply
    }


# ====================
# Tools API
# ====================

@app.get("/api/tools")
async def list_tools():
    """列出所有可用工具"""
    tools = tool_manager.list_tools()
    return {
        "success": True,
        "data": tools
    }


@app.post("/api/tools/{tool_name}/execute")
async def execute_tool(tool_name: str, params: Dict[str, Any]):
    """执行工具"""
    context = ToolContext(
        user_id="default",
        session_id="api_call",
        workspace="/workspace"
    )

    result = await tool_manager.execute(tool_name, params, context)

    return {
        "success": result.success,
        "data": result.data,
        "error": result.error
    }


# ====================
# Settings API
# ====================

@app.get("/api/settings")
async def get_settings():
    """获取设置"""
    settings = await db.settings.find_one({"user_id": "default"})
    return {
        "success": True,
        "data": settings or {}
    }


@app.post("/api/settings")
async def update_settings(settings: Dict[str, Any]):
    """更新设置"""
    await db.settings.update_one(
        {"user_id": "default"},
        {"$set": settings},
        upsert=True
    )
    return {"success": True}


# ====================
# Logs API
# ====================

@app.get("/api/logs")
async def get_logs(limit: int = 100):
    """获取日志"""
    logs = await db.logs.find().sort("created_at", -1).limit(limit).to_list(limit)
    return {
        "success": True,
        "data": logs
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
