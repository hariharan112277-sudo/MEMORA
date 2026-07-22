from flask import Blueprint, jsonify, request

from config import Config
from ml import ebbinghaus
from ml.predictor import predict_retention
from storage import store

retention_bp = Blueprint("retention", __name__)


@retention_bp.post("/api/retention/predict")
def predict():
    """
    Predict current retention for a learner's concept, plus a curve for charting.

    Body (either form works):
      { "learner_id": "L_HARIHARAN", "concept_id": "data_structures" }
    or raw features, useful for testing the ML model directly:
      { "difficulty": 0.5, "days_since_last_review": 6, "quiz_accuracy": 0.7,
        "response_time": 12.0, "attempt_count": 2 }
    """
    body = request.get_json(force=True, silent=True) or {}

    learner_id = body.get("learner_id")
    concept_id = body.get("concept_id")

    if learner_id and concept_id:
        concept = store.get_concept(learner_id, concept_id)
        if concept is None:
            return jsonify({"error": "learner or concept not found"}), 404

        current_day = store.get_current_day()
        days_since = current_day - concept["last_review"]

        # Closed-form Ebbinghaus retention using the concept's tracked strength.
        r_formula = ebbinghaus.retention(concept["strength"], days_since)

        # Also run the ML model for comparison, using proxy feature values
        # derived from the tracked state (a real deployment would pull the
        # learner's actual recent quiz stats here).
        ml_result = predict_retention(
            difficulty=concept.get("difficulty", 0.5),
            days_since_last_review=days_since,
            quiz_accuracy=r_formula,
            response_time=12.0,
            attempt_count=2,
            strength_fallback=concept["strength"],
        )

        return jsonify({
            "learner_id": learner_id,
            "concept_id": concept_id,
            "concept_name": concept["name"],
            "current_day": current_day,
            "days_since_last_review": days_since,
            "strength": round(concept["strength"], 2),
            "retention_formula": round(r_formula, 4),
            "retention_ml": ml_result["retention"],
            "ml_method": ml_result["method"],
            "status": ebbinghaus.status_for(r_formula),
            "curve": ebbinghaus.curve_points(concept["strength"]),
        })

    # Raw-feature mode (no stored learner/concept needed) — exercises the ML model directly.
    required = ["difficulty", "days_since_last_review", "quiz_accuracy", "response_time", "attempt_count"]
    missing = [f for f in required if f not in body]
    if missing:
        return jsonify({"error": f"missing fields: {missing}, or provide learner_id + concept_id instead"}), 400

    result = predict_retention(
        difficulty=body["difficulty"],
        days_since_last_review=body["days_since_last_review"],
        quiz_accuracy=body["quiz_accuracy"],
        response_time=body["response_time"],
        attempt_count=body["attempt_count"],
    )
    return jsonify(result)
