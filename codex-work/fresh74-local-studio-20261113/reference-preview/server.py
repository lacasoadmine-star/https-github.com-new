#!/usr/bin/env python3
"""Loopback-only, read-only server for the fresh 74-title reference bundle."""
from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

SAFE_SUFFIXES = {".html", ".css", ".js", ".json", ".jpg", ".jpeg", ".png", ".webp", ".mp4", ".svg", ".txt", ".md"}


def make_server(root, port=0):
    root = Path(root).resolve()
    catalogue = root / "catalogue.json"
    if not catalogue.is_file():
        catalogue = root / "reference-preview" / "catalogue.json"
    if not catalogue.is_file():
        raise ValueError("Build the reference preview before starting the server")

    class Handler(BaseHTTPRequestHandler):
        server_version = "FreshReference/1.0"

        def log_message(self, *_):
            pass

        def allowed_request(self):
            host = self.headers.get("Host", "")
            allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
            if host not in allowed:
                self.send_error(403, "Loopback host required")
                return False
            origin = self.headers.get("Origin")
            if origin and origin not in {"http://" + value for value in allowed}:
                self.send_error(403, "Same-origin local requests only")
                return False
            return True

        def end_headers(self):
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
            self.send_header("Cache-Control", "no-cache")
            super().end_headers()

        def do_HEAD(self):
            self.serve(head=True)

        def do_GET(self):
            self.serve()

        def deny_write(self):
            self.send_error(405, "This local evidence server is read-only")

        do_POST = do_PUT = do_DELETE = do_PATCH = do_OPTIONS = deny_write

        def json_response(self, value, head=False):
            content = json.dumps(value, ensure_ascii=False).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            if not head:
                self.wfile.write(content)

        def serve(self, head=False):
            if not self.allowed_request():
                return
            parsed = urlsplit(self.path)
            if parsed.scheme or parsed.netloc:
                self.send_error(400, "Absolute request targets are not accepted")
                return
            path = unquote(parsed.path)
            if path in ("/api/catalogue", "/api/progress", "/api/checkpoint", "/api/retry-queue", "/api/health"):
                try:
                    data = json.loads(catalogue.read_text())
                except (OSError, json.JSONDecodeError):
                    self.send_error(503, "The bundled snapshot remains available; checkpoint cannot be read")
                    return
                if path == "/api/catalogue":
                    value = data
                else:
                    retryable = sorted((e for e in data["entries"] if e.get("completeReferenceCapture") is not True), key=lambda e: e["index"])
                    value = {"status": "local-read-only", "buildId": data["buildId"], "sourceUpdatedAt": data.get("sourceUpdatedAt"),
                             "counts": data["counts"], "providerRequests": False,
                             "retryOrder": [e["index"] for e in retryable],
                             "nextInitialCatalogueIndex": retryable[0]["index"] if retryable else None,
                             "retryQueueStorage": "browser-local-checkpoint",
                             "verifiedNewCaptureAttemptsFromQueue": 0,
                             "retryableTitles": [{"index": e["index"], "name": e["name"], "status": e["status"]}
                                                 for e in retryable]}
                self.json_response(value, head)
                return
            if "\x00" in path or "\\" in path or ".." in path.split("/"):
                self.send_error(403, "Path outside the bundle is not allowed")
                return
            if path == "/" and not (root / "index.html").exists():
                self.send_response(302)
                self.send_header("Location", "/reference-preview/index.html")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if path == "/reference-preview/" and (root / "reference-preview" / "index.html").is_file():
                self.send_response(302)
                self.send_header("Location", "/reference-preview/index.html")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if path == "/":
                path = "/index.html"
            target = (root / path.lstrip("/")).resolve()
            if not target.is_relative_to(root) or target.suffix.lower() not in SAFE_SUFFIXES:
                self.send_error(403, "Path outside the bundle is not allowed")
                return
            if not target.is_file():
                self.send_error(404, "Bundle file not found")
                return
            size = target.stat().st_size
            start, end = 0, max(0, size - 1)
            range_header = self.headers.get("Range")
            partial = False
            if range_header:
                match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header)
                if not match or not any(match.groups()) or size == 0:
                    self.send_error(416, "Only one valid byte range is supported")
                    return
                left, right = match.groups()
                if left:
                    start = int(left)
                    end = min(int(right), size - 1) if right else size - 1
                else:
                    suffix = int(right)
                    if suffix <= 0:
                        self.send_error(416, "Invalid byte range")
                        return
                    start = max(0, size - suffix)
                    end = size - 1
                if start >= size or end < start:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                partial = True
            length = end - start + 1 if size else 0
            self.send_response(206 if partial else 200)
            self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(length))
            self.send_header("Accept-Ranges", "bytes")
            if partial:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            if not head:
                try:
                    with target.open("rb") as source:
                        source.seek(start)
                        remaining = length
                        while remaining:
                            block = source.read(min(256 * 1024, remaining))
                            if not block:
                                break
                            self.wfile.write(block)
                            remaining -= len(block)
                except (BrokenPipeError, ConnectionResetError):
                    pass

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True, help="Built reference-preview directory, or its local-app parent")
    parser.add_argument("--port", type=int, default=8740)
    args = parser.parse_args()
    server = make_server(args.root, args.port)
    print(f"Fresh reference viewer: http://127.0.0.1:{server.server_port}/", flush=True)
    print("Read-only local evidence. No provider connection. Ctrl+C stops the server.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
