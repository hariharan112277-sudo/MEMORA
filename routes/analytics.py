from flask import Blueprint, jsonify, request

from ml import ebbinghaus
from storage import store

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.get("/api/analytics")
def get_analytics():
    """
    Returns high-level learner analytics, per-concept status, and retention trends.

    Query params: ?learner_id=L_HARIHARAN
    """
    learner_id = request.args.get("learner_id")
    if not learner_id:
        return jsonify({"error": "learner_id query parameter is required"}), 400

    learner = store.get_learner(learner_id)
    if learner is None:
        return jsonify({"error": f"Learner '{learner_id}' not found"}), 404

    current_day = learner.get("current_day", 0)
    concepts = learner.get("concepts", {})

    per_concept = []
    total_retention = 0.0
    counts = {"stable": 0, "weak": 0, "critical": 0}
    total_reviews = 0
    accuracies = []

    for cid, c in concepts.items():
        days_since = current_day - c.get("last_review", 0)
        ret = round(ebbinghaus.retention(c.get("strength", 1.0), days_since), 4)
        stat = ebbinghaus.status_for(ret)

        counts[stat] = counts.get(stat, 0) + 1
        total_retention += ret
        total_reviews += c.get("review_count", 0)

        acc = c.get("rolling_quiz_accuracy")
        if acc is not None:
            accuracies.append(acc)

        per_concept.append({
            "concept_id": cid,
            "name": c.get("name", cid),
            "retention": ret,
            "status": stat,
            "strength": round(c.get("strength", 1.0), 2),
            "days_since_last_review": days_since,
            "rolling_quiz_accuracy": acc,
        })

    num_concepts = len(concepts)
    overall_retention = round(total_retention / num_concepts, 4) if num_concepts > 0 else 0.0
    avg_quiz_acc = round(sum(accuracies) / len(accuracies), 4) if accuracies else None

    # Trend calculation from learner history
    history = learner.get("history", [])
    day_groups = {}
    for entry in history:
        d = entry.get("day")
        r = entry.get("retention")
        if d is not None and r is not None:
            day_groups.setdefault(d, []).append(r)

    trend = []
    for d in sorted(day_groups.keys()):
        rets = day_groups[d]
        avg_r = round(sum(rets) / len(rets), 4) if rets else 0.0
        trend.append({"day": d, "avg_retention": avg_r})

    return jsonify({
        "learner_id": learner_id,
        "current_day": current_day,
        "overall_retention": overall_retention,
        "counts": counts,
        "review_count": total_reviews,
        "avg_quiz_accuracy": avg_quiz_acc,
        "per_concept": per_concept,
        "trend": trend,
    })
