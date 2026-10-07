"""Send a committed ledger event to open sockets and to Redis when configured."""

from app.core.realtime import hub, publish_redis


async def emit(result: dict) -> dict:
    event = result.get("event")
    targets = result.get("targets") or []
    if event and targets:
        await hub.broadcast(targets, event)
        publish_redis({"targets": targets, "event": event})
    return result["body"]
