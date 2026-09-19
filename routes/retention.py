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

        # Closed-form Ebbinghaus retention using concept's tracked strength
        r_formula = ebbinghaus.retention(concept["strength"], days_since)

        # Real quiz statistics fed into ML model
        rolling_acc = concept.get("rolling_quiz_accuracy")
        quiz_accuracy = rolling_acc if rolling_acc is not None else r_formula

        avg_rt = concept.get("avg_response_time")
        response_time = avg_rt if avg_rt is not None else 12.0

        rev_cnt = concept.get("review_count", 0)
        attempt_count = rev_cnt if rev_cnt > 0 else 2

        features_used = {
            "difficulty": round(concept.get("difficulty", 0.5), 4),
            "days_since_last_review": round(days_since, 2),
            "quiz_accuracy": round(quiz_accuracy, 4),
            "response_time": round(response_time, 2),
            "attempt_count": attempt_count,
        }

        ml_result = predict_retention(
            difficulty=features_used["difficulty"],
            days_since_last_review=features_used["days_since_last_review"],
            quiz_accuracy=features_used["quiz_accuracy"],
            response_time=features_used["response_time"],
            attempt_count=features_used["attempt_count"],
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
            "features_used": features_used,
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
