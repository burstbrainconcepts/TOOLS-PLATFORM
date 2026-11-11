"""Minimal service shell (stdlib only). Replace/extend per project."""
import json, os
from http.server import BaseHTTPRequestHandler, HTTPServer

NAME = os.environ.get("SERVICE_NAME", "unknown")
SIBLINGS = {k: os.environ.get(k, "") for k in ("SPEC_KIT_URL", "ARTEMIS_URL", "XTOOL_URL")}

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            body, ctype = b"ok", "text/plain"
        else:
            body = json.dumps({
                "service": NAME,
                "database_configured": bool(os.environ.get("DATABASE_URL")),
                "siblings": SIBLINGS,
            }, indent=2).encode()
            ctype = "application/json"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), H).serve_forever()
