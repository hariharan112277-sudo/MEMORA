from flask import Blueprint, jsonify, request

from ml import ebbinghaus
from storage import store

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.get("/api/analytics")
def get_analytics():
    """
    Returns high-level learner analytics, per-concept status, retention trends, and review stats.
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
    reviews_today = 0
    accuracies = []
    all_attempts = []
    active_days = set()

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

        qh = c.get("quiz_history", [])
        for attempt_entry in qh:
            attempt_day = attempt_entry.get("day", 0)
            active_days.add(attempt_day)
            if attempt_day == current_day:
                reviews_today += 1
            all_attempts.append({
                "id": f"{cid}_{attempt_day}_{len(all_attempts)}",
                "day": attempt_day,
                "concept_id": cid,
                "concept_name": c.get("name", cid),
                "question_text": attempt_entry.get("question_id", "Quiz Question").replace("_", " ").title(),
                "correct": bool(attempt_entry.get("correct")),
                "time_ms": int((attempt_entry.get("response_time") or 10.0) * 1000),
            })

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
    avg_quiz_acc = round(sum(accuracies) / len(accuracies), 4) if accuracies else 0.85

    # Calculate streak (consecutive days up to current_day with reviews)
    streak = 0
    check_day = current_day
    while check_day in active_days or (check_day == current_day and reviews_today > 0):
        streak += 1
        check_day -= 1
        if streak > 365 or check_day < 0:
            break
    if streak == 0 and len(active_days) > 0:
        streak = 1

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

    # Reviews by day (last 14 days)
    start_d = max(0, current_day - 13)
    reviews_by_day = []
    for d in range(start_d, current_day + 1):
        attempts_d = [a for a in all_attempts if a["day"] == d]
        corr = sum(1 for a in attempts_d if a["correct"])
        inc = len(attempts_d) - corr
        reviews_by_day.append({
            "day": d,
            "label": "Today" if d == current_day else f"Day {d}",
            "correct": corr,
            "incorrect": inc,
        })

    # Sort recent attempts newest first
    all_attempts.sort(key=lambda x: x["day"], reverse=True)
    recent_attempts = all_attempts[:10]

    return jsonify({
        "learner_id": learner_id,
        "current_day": current_day,
        "overall_retention": overall_retention,
        "avg_retention": overall_retention,
        "accuracy": avg_quiz_acc,
        "counts": counts,
        "stable_count": counts.get("stable", 0),
        "weak_count": counts.get("weak", 0),
        "critical_count": counts.get("critical", 0),
        "total_reviews": total_reviews,
        "review_count": total_reviews,
        "reviews_today": reviews_today,
        "streak": streak,
        "avg_quiz_accuracy": avg_quiz_acc,
        "per_concept": per_concept,
        "trend": trend,
        "reviews_by_day": reviews_by_day,
        "recent_attempts": recent_attempts,
    })
