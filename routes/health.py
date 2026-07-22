from flask import Blueprint, jsonify
from ml.predictor import is_ml_available

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "memora-backend",
        "ml_model_loaded": is_ml_available(),
    })
