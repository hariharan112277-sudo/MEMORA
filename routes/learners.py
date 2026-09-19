from flask import Blueprint, jsonify, request

from ml import ebbinghaus
from storage import store

learners_bp = Blueprint("learners", __name__)


@learners_bp.post("/api/learners")
def create_learner():
    """
    Creates a new learner profile.

    Body: { "name": "Priya Sharma", "registration_no": "2104251040099" }
    """
    body = request.get_json(force=True, silent=True) or {}
    name = body.get("name")
    reg_no = body.get("registration_no", "")

    if not name or not isinstance(name, str):
        return jsonify({"error": "name string is required"}), 400

    name_clean = name.strip()
    if len(name_clean) < 2 or len(name_clean) > 80:
        return jsonify({"error": "name must be between 2 and 80 characters"}), 400

    result = store.add_learner(name_clean, registration_no=reg_no)
    return jsonify(result), 201


@learners_bp.get("/api/learners/<learner_id>")
def get_learner(learner_id):
    """
    Retrieves full learner profile including per-concept memory state.
    """
    learner = store.get_learner(learner_id)
    if learner is None:
        return jsonify({"error": f"Learner '{learner_id}' not found"}), 404

    current_day = learner.get("current_day", 0)
    concepts_out = []
    for cid, c in learner.get("concepts", {}).items():
        days_since = current_day - c.get("last_review", 0)
        ret = round(ebbinghaus.retention(c.get("strength", 1.0), days_since), 4)
        stat = ebbinghaus.status_for(ret)
        concepts_out.append({
            "concept_id": cid,
            "name": c.get("name", cid),
            "strength": round(c.get("strength", 1.0), 2),
            "last_review": c.get("last_review", 0),
            "difficulty": c.get("difficulty", 0.5),
            "retention": ret,
            "status": stat,
            "review_count": c.get("review_count", 0),
            "rolling_quiz_accuracy": c.get("rolling_quiz_accuracy"),
        })

    return jsonify({
        "learner_id": learner_id,
        "name": learner.get("name"),
        "registration_no": learner.get("registration_no", ""),
        "current_day": current_day,
        "concepts": concepts_out,
    }), 200


@learners_bp.delete("/api/learners/<learner_id>")
def delete_learner(learner_id):
    """
    Deletes a learner profile.
    """
    success = store.delete_learner(learner_id)
    if not success:
        return jsonify({"error": f"Learner '{learner_id}' not found"}), 404
    return "", 204


@learners_bp.post("/api/learners/<learner_id>/concepts")
def create_concept(learner_id):
    """
    Adds a new concept to a learner's workspace.

    Body: { "name": "Graph Theory", "difficulty": 0.55 }
    """
    body = request.get_json(force=True, silent=True) or {}
    name = body.get("name")
    diff_val = body.get("difficulty")

    if not name or not isinstance(name, str):
        return jsonify({"error": "name string is required"}), 400

    name_clean = name.strip()
    if len(name_clean) < 2 or len(name_clean) > 80:
        return jsonify({"error": "name must be between 2 and 80 characters"}), 400

    if diff_val is None:
        return jsonify({"error": "difficulty (float 0-1) is required"}), 400

    try:
        difficulty = float(diff_val)
        if difficulty < 0.0 or difficulty > 1.0:
            return jsonify({"error": "difficulty must be between 0 and 1"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "difficulty must be a valid float between 0 and 1"}), 400

    result = store.add_concept(learner_id, name_clean, difficulty)
    if result is None:
        return jsonify({"error": f"Learner '{learner_id}' not found"}), 404

    return jsonify(result), 201


@learners_bp.delete("/api/learners/<learner_id>/concepts/<concept_id>")
def delete_concept(learner_id, concept_id):
    """
    Deletes a concept from a learner's profile.
    """
    success = store.delete_concept(learner_id, concept_id)
    if not success:
        return jsonify({"error": f"Learner '{learner_id}' or concept '{concept_id}' not found"}), 404
    return "", 204
