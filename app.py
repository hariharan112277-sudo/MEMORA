"""
MEMORA backend — Flask REST API.

Implements the API surface described in the System Architecture slide:
  POST /api/retention/predict
  GET  /api/concepts/weak
  POST /api/schedule/generate
  POST /api/quiz/submit

Plus supporting routes: /api/health, /api/learners, /api/concepts,
/api/day/advance, /api/reset.

Run:
    python app.py
Then visit http://localhost:5000/api/health
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS

from config import Config
from routes.health import health_bp
from routes.retention import retention_bp
from routes.concepts import concepts_bp
from routes.schedule import schedule_bp
from routes.quiz import quiz_bp
from routes.misc import misc_bp
from routes.analytics import analytics_bp


def create_app():
    app = Flask(__name__)
    CORS(app, origins=Config.CORS_ORIGIN)

    app.register_blueprint(health_bp)
    app.register_blueprint(retention_bp)
    app.register_blueprint(concepts_bp)
    app.register_blueprint(schedule_bp)
    app.register_blueprint(quiz_bp)
    app.register_blueprint(misc_bp)
    app.register_blueprint(analytics_bp)

    @app.get("/")
    def index():
        return {
            "service": "MEMORA — Cognitive Learning Retention Intelligence System",
            "endpoints": [
                "GET  /api/health",
                "GET  /api/learners",
                "GET  /api/concepts?learner_id=",
                "GET  /api/concepts/weak?learner_id=",
                "GET  /api/analytics?learner_id=",
                "POST /api/retention/predict",
                "POST /api/schedule/generate",
                "POST /api/quiz/submit",
                "POST /api/day/advance",
                "POST /api/reset",
            ],
        }

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
