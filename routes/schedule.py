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
    threshold, soonest first (overdue items first).

    Body: { "learner_id": "L_HARIHARAN", "threshold": 0.8 }   ("threshold" optional)
    """
    body = request.get_json(force=True, silent=True) or {}
    learner_id = body.get("learner_id")
    threshold_val = body.get("threshold", Config.RETENTION_THRESHOLD)

    if not learner_id:
        return jsonify({"error": "learner_id is required"}), 400

    try:
        threshold = float(threshold_val)
        if threshold <= 0 or threshold >= 1:
            return jsonify({"error": "threshold must be between 0 and 1"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "threshold must be a valid float between 0 and 1"}), 400

    concepts = store.list_concepts(learner_id)
    if concepts is None:
        return jsonify({"error": f"Learner '{learner_id}' not found"}), 404

    current_day = store.get_current_day()
    schedule = []
    overdue_count = 0

    for c in concepts:
        days_since = current_day - c["last_review"]
        cur_ret = round(ebbinghaus.retention(c["strength"], days_since), 4)
        stat = ebbinghaus.status_for(cur_ret)

        threshold_days = ebbinghaus.days_until_threshold(c["strength"], threshold)
        raw_due = c["last_review"] + threshold_days - current_day

        is_overdue = raw_due < 0
        if is_overdue:
            overdue_count += 1
            days_overdue = round(max(0.0, -raw_due), 2)
        else:
            days_overdue = 0.0

        due_in_days = max(0, round(raw_due))
        due_day = round(current_day + max(0.0, raw_due))

        schedule.append({
            "concept_id": c["concept_id"],
            "concept_name": c["name"],
            "due_in_days": due_in_days,
            "due_day": due_day,
            "current_retention": cur_ret,
            "overdue": is_overdue,
            "days_overdue": days_overdue,
            "status": stat,
            "_raw_due": raw_due,
        })

    def sort_key(item):
        if item["overdue"]:
            # Larger days_overdue comes first (so -days_overdue), then lower retention first
            return (0, -item["days_overdue"], item["current_retention"])
        else:
            # Future items by due_in_days ascending
            return (1, item["due_in_days"], item["current_retention"])

    schedule.sort(key=sort_key)

    for item in schedule:
        item.pop("_raw_due", None)

    return jsonify({
        "learner_id": learner_id,
        "current_day": current_day,
        "threshold": threshold,
        "overdue_count": overdue_count,
        "schedule": schedule,
    })
