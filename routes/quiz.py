from flask import Blueprint, jsonify, request

from ml import ebbinghaus
from storage import store

quiz_bp = Blueprint("quiz", __name__)


@quiz_bp.post("/api/quiz/submit")
def submit():
    """
    Submits a quiz result for a concept and updates its memory strength.

    Body: { "learner_id": "L_HARIHARAN", "concept_id": "data_structures", "correct": true }
    """
    body = request.get_json(force=True, silent=True) or {}
    learner_id = body.get("learner_id")
    concept_id = body.get("concept_id")
    correct = body.get("correct")

    if not learner_id or not concept_id or correct is None:
        return jsonify({"error": "learner_id, concept_id and correct (bool) are required"}), 400

    concept = store.get_concept(learner_id, concept_id)
    if concept is None:
        return jsonify({"error": "learner or concept not found"}), 404

    current_day = store.get_current_day()
    new_strength = ebbinghaus.update_strength(
        concept["strength"], bool(correct), concept.get("difficulty", 0.5)
    )
    updated = store.update_concept(learner_id, concept_id, new_strength, current_day)

    return jsonify({
        "learner_id": learner_id,
        "concept_id": concept_id,
        "correct": bool(correct),
        "previous_strength": round(concept["strength"], 2),
        "new_strength": round(updated["strength"], 2),
        "last_review": updated["last_review"],
        "retention_now": round(ebbinghaus.retention(updated["strength"], 0), 4),
        "next_review_estimate_days": round(ebbinghaus.days_until_threshold(updated["strength"]), 1),
    })
