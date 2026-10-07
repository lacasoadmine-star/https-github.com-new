"""In-process fan-out, with Redis pub/sub when REDIS_URL is set."""

from __future__ import annotations

import asyncio
import json
import os

from fastapi import WebSocket


class Hub:
    def __init__(self) -> None:
        self.loop: asyncio.AbstractEventLoop | None = None
        self.clients: dict[tuple[str, int], set[WebSocket]] = {}

    async def connect(self, portal: str, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.clients.setdefault((portal, user_id), set()).add(websocket)

    def disconnect(self, portal: str, user_id: int, websocket: WebSocket) -> None:
        self.clients.get((portal, user_id), set()).discard(websocket)

    async def broadcast(self, targets: list[tuple[str, int]], payload: dict) -> None:
        for portal, user_id in targets:
            dead: list[WebSocket] = []
            for websocket in list(self.clients.get((portal, user_id), set())):
                try:
                    await websocket.send_json(payload)
                except Exception:
                    dead.append(websocket)
            for websocket in dead:
                self.disconnect(portal, user_id, websocket)

    def publish(self, targets: list[tuple[str, int]], payload: dict) -> None:
        if self.loop is None:
            return
        asyncio.run_coroutine_threadsafe(self.broadcast(targets, payload), self.loop)


hub = Hub()


def redis_status() -> str:
    url = os.getenv("REDIS_URL")
    if not url:
        return "DISABLED"
    try:
        import redis

        client = redis.Redis.from_url(url, socket_connect_timeout=0.3)
        client.ping()
        return "CONNECTED"
    except Exception:
        return "UNAVAILABLE"


def publish_redis(payload: dict) -> None:
    url = os.getenv("REDIS_URL")
    if not url:
        return
    try:
        import redis

        client = redis.Redis.from_url(url, socket_connect_timeout=0.3)
        client.publish("superwin.events", json.dumps(payload))
    except Exception:
        return
