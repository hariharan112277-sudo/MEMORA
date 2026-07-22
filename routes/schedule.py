from flask import Blueprint, jsonify, request

from config import Config
from ml import ebbinghaus
from storage import store

schedule_bp = Blueprint("schedule", __name__)


@schedule_bp.post("/api/schedule/generate")
def generate():
    """
    Generates a personalized revision schedule for a learner: for every
    concept, the day it should next be revised to stay above the retention
    threshold, soonest first.

    Body: { "learner_id": "L_HARIHARAN", "threshold": 0.8 }   ("threshold" optional)
    """
    body = request.get_json(force=True, silent=True) or {}
    learner_id = body.get("learner_id")
    threshold = float(body.get("threshold", Config.RETENTION_THRESHOLD))

    if not learner_id:
        return jsonify({"error": "learner_id is required"}), 400

    concepts = store.list_concepts(learner_id)
    if concepts is None:
        return jsonify({"error": "learner not found"}), 404

    current_day = store.get_current_day()
    schedule = []
    for c in concepts:
        due_day = c["last_review"] + ebbinghaus.days_until_threshold(c["strength"], threshold)
        due_in = max(0, round(due_day - current_day))
        schedule.append({
            "concept_id": c["concept_id"],
            "concept_name": c["name"],
            "due_in_days": due_in,
            "due_day": round(current_day + due_in),
            "current_retention": round(ebbinghaus.retention(c["strength"], current_day - c["last_review"]), 4),
        })

    schedule.sort(key=lambda x: x["due_in_days"])
    return jsonify({
        "learner_id": learner_id,
        "current_day": current_day,
        "threshold": threshold,
        "schedule": schedule,
    })
