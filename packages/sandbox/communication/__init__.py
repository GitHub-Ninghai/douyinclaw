"""
Connection Manager
WebSocket 连接管理器
"""

from typing import List
from fastapi import WebSocket


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """接受新连接"""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"📡 New connection. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """断开连接"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"🔌 Connection closed. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """发送个人消息"""
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        """广播消息"""
        for connection in self.active_connections:
            await connection.send_json(message)
