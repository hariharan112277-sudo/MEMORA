from flask import Blueprint, jsonify, request

from ml import ebbinghaus
from storage import store

concepts_bp = Blueprint("concepts", __name__)


def _with_retention(learner_id, concept, current_day):
    days_since = current_day - concept["last_review"]
    r = ebbinghaus.retention(concept["strength"], days_since)
    return {
        **concept,
        "days_since_last_review": days_since,
        "retention": round(r, 4),
        "status": ebbinghaus.status_for(r),
    }


@concepts_bp.get("/api/concepts")
def list_all():
    learner_id = request.args.get("learner_id")
    if not learner_id:
        return jsonify({"error": "learner_id query param is required"}), 400

    concepts = store.list_concepts(learner_id)
    if concepts is None:
        return jsonify({"error": "learner not found"}), 404

    current_day = store.get_current_day()
    enriched = [_with_retention(learner_id, c, current_day) for c in concepts]
    return jsonify({"learner_id": learner_id, "current_day": current_day, "concepts": enriched})


@concepts_bp.get("/api/concepts/weak")
def weak():
    """Concepts flagged Weak or Critical, sorted by lowest predicted retention first."""
    learner_id = request.args.get("learner_id")
    if not learner_id:
        return jsonify({"error": "learner_id query param is required"}), 400

    concepts = store.list_concepts(learner_id)
    if concepts is None:
        return jsonify({"error": "learner not found"}), 404

    current_day = store.get_current_day()
    enriched = [_with_retention(learner_id, c, current_day) for c in concepts]
    weak_concepts = sorted(
        [c for c in enriched if c["status"] in ("weak", "critical")],
        key=lambda c: c["retention"],
    )
    return jsonify({"learner_id": learner_id, "current_day": current_day, "weak_concepts": weak_concepts})
