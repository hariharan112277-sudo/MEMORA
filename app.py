"""
MEMORA backend — Flask REST API & Single-Page Application Host.

Implements the API surface:
  POST /api/retention/predict
  GET  /api/concepts/weak
  POST /api/schedule/generate
  POST /api/quiz/submit

Serves the compiled React frontend from memora-ui/dist.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, send_file, send_from_directory
from flask_cors import CORS

from config import Config
from routes.health import health_bp
from routes.retention import retention_bp
from routes.concepts import concepts_bp
from routes.schedule import schedule_bp
from routes.quiz import quiz_bp
from routes.misc import misc_bp
from routes.analytics import analytics_bp
from routes.learners import learners_bp


def create_app():
    dist_dir = os.path.join(Config.BASE_DIR, "memora-ui", "dist")
    app = Flask(__name__)

    CORS(app, origins=Config.CORS_ORIGIN)

    # Register API blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(retention_bp)
    app.register_blueprint(concepts_bp)
    app.register_blueprint(schedule_bp)
    app.register_blueprint(quiz_bp)
    app.register_blueprint(misc_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(learners_bp)

    # Serve static assets from memora-ui/dist/assets
    @app.get("/assets/<path:filename>")
    def serve_assets(filename):
        assets_dir = os.path.join(dist_dir, "assets")
        if os.path.exists(assets_dir):
            return send_from_directory(assets_dir, filename)
        return {"error": "Asset not found"}, 404

    # Serve favicon if present
    @app.get("/favicon.ico")
    def serve_favicon():
        if os.path.exists(os.path.join(dist_dir, "favicon.ico")):
            return send_from_directory(dist_dir, "favicon.ico")
        return "", 204

    # SPA Client routes
    @app.get("/")
    @app.get("/dashboard")
    @app.get("/concepts")
    @app.get("/schedule")
    @app.get("/analytics")
    @app.get("/about")
    def serve_spa():
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            return send_file(index_file)
        return send_file(os.path.join(Config.BASE_DIR, "memora-frontend.html"))

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
