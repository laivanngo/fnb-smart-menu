# File: websocket_manager.py
# Mục đích: Quản lý kết nối Real-time (Admin & Đơn nhóm)

from fastapi import WebSocket
from typing import List, Dict
import json

class ConnectionManager:
    def __init__(self):
        # 1. Danh sách Admin (Nhận thông báo đơn mới)
        self.active_connections: List[WebSocket] = []
        
        # 2. Danh sách Nhóm đặt đơn (Key: group_id, Value: List[WebSocket])
        self.group_connections: Dict[str, List[WebSocket]] = {}

    # --- PHẦN CHO ADMIN ---
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Gửi thông báo cho tất cả Admin"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

    # --- PHẦN CHO ĐƠN NHÓM (GROUP ORDER) ---
    async def connect_group(self, websocket: WebSocket, group_id: str):
        """Người dùng tham gia vào một nhóm"""
        await websocket.accept()
        if group_id not in self.group_connections:
            self.group_connections[group_id] = []
        self.group_connections[group_id].append(websocket)
        print(f"➕ User joined Group {group_id}. Total: {len(self.group_connections[group_id])}")

    def disconnect_group(self, websocket: WebSocket, group_id: str):
        """Người dùng thoát nhóm"""
        if group_id in self.group_connections:
            if websocket in self.group_connections[group_id]:
                self.group_connections[group_id].remove(websocket)
            # Nếu nhóm trống thì xóa luôn để tiết kiệm bộ nhớ
            if not self.group_connections[group_id]:
                del self.group_connections[group_id]

    async def broadcast_group(self, group_id: str, message: dict, sender_socket: WebSocket = None):
        """
        Gửi tin nhắn cho tất cả người trong nhóm.
        Nếu truyền sender_socket, sẽ KHÔNG gửi lại cho người đó (tránh lặp món).
        """
        if group_id in self.group_connections:
            for connection in self.group_connections[group_id]:
                # Chỉ gửi cho người khác, không gửi lại cho người gửi (nếu có sender_socket)
                if sender_socket and connection == sender_socket:
                    continue
                try:
                    await connection.send_json(message)
                except:
                    pass

# Tạo instance dùng chung
manager = ConnectionManager()