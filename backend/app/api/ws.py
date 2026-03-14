"""
Swarm Suite — WebSocket Endpoint

Provides a single authenticated WebSocket endpoint that supports:
  - Global broadcast subscription (automatic on connect)
  - Channel subscriptions (mission:<id>, agent:<id>)
  - Receiving banter messages via WebSocket (alternative to REST POST)
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.database import async_session
from app.core.security import get_ws_user
from app.core.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Authenticated WebSocket endpoint.

    Connect with: ws://host/ws?token=<jwt_access_token>

    Client can send JSON messages:
      {"action": "subscribe", "channel": "mission:<id>"}
      {"action": "unsubscribe", "channel": "mission:<id>"}
      {"action": "ping"}
    """
    async with async_session() as db:
        user = await get_ws_user(websocket, db)
        if user is None:
            return  # Connection was closed in get_ws_user

    await manager.connect(websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "error": "Invalid JSON"
                }))
                continue

            action = data.get("action")

            if action == "subscribe":
                channel = data.get("channel", "")
                if channel:
                    manager.subscribe(websocket, channel)
                    await websocket.send_text(json.dumps({
                        "event": "subscribed",
                        "channel": channel,
                    }))

            elif action == "unsubscribe":
                channel = data.get("channel", "")
                if channel:
                    manager.unsubscribe(websocket, channel)
                    await websocket.send_text(json.dumps({
                        "event": "unsubscribed",
                        "channel": channel,
                    }))

            elif action == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))

            else:
                await websocket.send_text(json.dumps({
                    "error": f"Unknown action: {action}"
                }))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket error: %s", e)
        manager.disconnect(websocket)
