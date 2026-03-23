"""
Autonomous — WebSocket Connection Manager

Manages active WebSocket connections and provides broadcasting capabilities
for real-time updates across the platform.

Supports:
  - Global broadcasts (all connected clients)
  - Targeted broadcasts by mission or agent channel
  - Automatic cleanup of disconnected clients
  - User presence tracking (who's online)
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Thread-safe WebSocket connection manager with user presence tracking.

    Clients can subscribe to specific channels (e.g., "mission:<id>",
    "agent:<id>") in addition to the global broadcast channel.
    """

    def __init__(self) -> None:
        # All active connections
        self._active: list[WebSocket] = []
        # Channel subscriptions: channel_name -> set of WebSocket
        self._channels: dict[str, set[WebSocket]] = {}
        # Presence tracking: WebSocket -> user info dict
        self._presence: dict[WebSocket, dict[str, Any]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_info: Optional[dict[str, Any]] = None,
    ) -> None:
        """Accept and register a new WebSocket connection with optional user info."""
        await websocket.accept()
        self._active.append(websocket)

        if user_info:
            self._presence[websocket] = user_info
            # Broadcast presence update to all other clients
            await self._broadcast_presence_event("user_joined", user_info)

        logger.info(
            "WebSocket connected: %s (user: %s)",
            websocket.client,
            user_info.get("username") if user_info else "unknown",
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from all registries and broadcast departure."""
        user_info = self._presence.pop(websocket, None)

        if websocket in self._active:
            self._active.remove(websocket)

        # Remove from all channels
        for channel_sockets in self._channels.values():
            channel_sockets.discard(websocket)

        logger.info(
            "WebSocket disconnected: %s (user: %s)",
            websocket.client,
            user_info.get("username") if user_info else "unknown",
        )

        # Schedule presence departure broadcast (fire-and-forget)
        if user_info:
            import asyncio
            asyncio.ensure_future(
                self._broadcast_presence_event("user_left", user_info)
            )

    def subscribe(self, websocket: WebSocket, channel: str) -> None:
        """Subscribe a WebSocket to a named channel."""
        if channel not in self._channels:
            self._channels[channel] = set()
        self._channels[channel].add(websocket)

    def unsubscribe(self, websocket: WebSocket, channel: str) -> None:
        """Unsubscribe a WebSocket from a named channel."""
        if channel in self._channels:
            self._channels[channel].discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Send a JSON message to all connected clients."""
        payload = json.dumps(message)
        disconnected: list[WebSocket] = []
        for ws in self._active:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    async def broadcast_to_channel(
        self, channel: str, message: dict[str, Any]
    ) -> None:
        """Send a JSON message to all clients subscribed to a channel."""
        sockets = self._channels.get(channel, set())
        if not sockets:
            return
        payload = json.dumps(message)
        disconnected: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    async def _broadcast_presence_event(
        self, event: str, user_info: dict[str, Any]
    ) -> None:
        """Broadcast a presence event (join/leave) with the current online list."""
        await self.broadcast({
            "event": event,
            "data": {
                "user": user_info,
                "online_users": self.get_online_users(),
                "online_count": self.active_count,
            },
        })

    def get_online_users(self) -> list[dict[str, Any]]:
        """Return a deduplicated list of currently online users."""
        seen: set[str] = set()
        users: list[dict[str, Any]] = []
        for info in self._presence.values():
            uid = info.get("id", "")
            if uid and uid not in seen:
                seen.add(uid)
                users.append(info)
        return users

    @property
    def active_count(self) -> int:
        """Number of active WebSocket connections."""
        return len(self._active)


# Singleton instance used across the application
manager = ConnectionManager()
