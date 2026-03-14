"""
Swarm Suite — WebSocket Connection Manager

Manages active WebSocket connections and provides broadcasting capabilities
for real-time updates across the platform.

Supports:
  - Global broadcasts (all connected clients)
  - Targeted broadcasts by mission or agent channel
  - Automatic cleanup of disconnected clients
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Thread-safe WebSocket connection manager.

    Clients can subscribe to specific channels (e.g., "mission:<id>",
    "agent:<id>") in addition to the global broadcast channel.
    """

    def __init__(self) -> None:
        # All active connections
        self._active: list[WebSocket] = []
        # Channel subscriptions: channel_name -> set of WebSocket
        self._channels: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self._active.append(websocket)
        logger.info("WebSocket connected: %s", websocket.client)

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from all registries."""
        if websocket in self._active:
            self._active.remove(websocket)
        # Remove from all channels
        for channel_sockets in self._channels.values():
            channel_sockets.discard(websocket)
        logger.info("WebSocket disconnected: %s", websocket.client)

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

    @property
    def active_count(self) -> int:
        """Number of active WebSocket connections."""
        return len(self._active)


# Singleton instance used across the application
manager = ConnectionManager()
