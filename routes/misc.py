from flask import Blueprint, jsonify, request

from storage import store

misc_bp = Blueprint("misc", __name__)


@misc_bp.get("/api/learners")
def learners():
    return jsonify({"learners": store.list_learners()})


@misc_bp.post("/api/day/advance")
def advance_day():
    """Advances the simulation clock, mirroring the 'Advance +1 Day' button in the frontend."""
    body = request.get_json(force=True, silent=True) or {}
    by = int(body.get("by", 1))
    new_day = store.advance_day(by)
    return jsonify({"current_day": new_day})


@misc_bp.post("/api/reset")
def reset():
    """Resets all learner/concept state back to the seed demo data."""
    store.reset()
    return jsonify({"status": "reset", "current_day": store.get_current_day()})
