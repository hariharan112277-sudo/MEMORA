from flask import Blueprint, jsonify, request

from ml import ebbinghaus
from storage import store

quiz_bp = Blueprint("quiz", __name__)


@quiz_bp.post("/api/quiz/submit")
def submit():
    """
    Submits a quiz result for a concept and updates its memory strength.

    Body: { "learner_id": "L_HARIHARAN", "concept_id": "data_structures", "correct": true, "response_time": 12.5 }
    """
    body = request.get_json(force=True, silent=True) or {}
    learner_id = body.get("learner_id")
    concept_id = body.get("concept_id")
    correct = body.get("correct")
    response_time = body.get("response_time")

    if not learner_id or not concept_id or correct is None:
        return jsonify({"error": "learner_id, concept_id and correct (bool) are required"}), 400

    if response_time is not None:
        try:
            response_time = float(response_time)
            if response_time < 0 or response_time > 600:
                return jsonify({"error": "response_time must be between 0 and 600 seconds"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "response_time must be a valid number"}), 400

    result = store.add_quiz_result(learner_id, concept_id, bool(correct), response_time=response_time)
    if result is None:
        return jsonify({"error": "learner or concept not found"}), 404

    return jsonify(result)

