from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from predictor import build_predictions


HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 9100))


class PredictionHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        if self.path != "/predict":
            self._send_json(404, {"message": "Not found"})
            return

        self._send_json(200, {
            "service": "Cityscape ML prediction service",
            "status": "running",
            "method": "POST /predict",
            "expectedPayload": {
                "horizon": 7,
                "history": [
                    {
                        "date": "2026-04-01",
                        "bookings": 3,
                        "revenue": 1200,
                        "occupancyRate": 42
                    }
                ]
            }
        })

    def do_POST(self):
        if self.path != "/predict":
            self._send_json(404, {"message": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length).decode("utf-8")
            payload = json.loads(raw_body or "{}")
            predictions = build_predictions(payload)
            self._send_json(200, predictions)
        except Exception as exc:
            self._send_json(500, {
                "message": "Prediction failed",
                "error": str(exc)
            })

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), PredictionHandler)
    print(f"Cityscape ML service running on http://{HOST}:{PORT}/predict")
    server.serve_forever()
