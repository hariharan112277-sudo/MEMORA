from flask import Blueprint, jsonify, request
from ml import ebbinghaus
from storage import store

subjects_bp = Blueprint("subjects", __name__)


@subjects_bp.get("/api/subjects")
def list_subjects():
    learner_id = request.args.get("learner_id", "L_HARIHARAN")
    concepts = store.list_concepts(learner_id) or []
    current_day = store.get_current_day()

    # Default category mapping
    cs_concepts = []
    for c in concepts:
        days_since = current_day - c["last_review"]
        r = round(ebbinghaus.retention(c["strength"], days_since), 4)
        cs_concepts.append({
            "id": c["concept_id"],
            "name": c["name"],
            "retention": r,
            "status": ebbinghaus.status_for(r),
            "strength": c["strength"],
            "last_review": c["last_review"],
        })

    # Group into subjects
    subjects = [
        {
            "id": "computer_science",
            "name": "Computer Science Core",
            "category": "Technology & Engineering",
            "description": "Core computer science fundamentals: Data Structures, OS, DBMS, ML & Computer Networks.",
            "concept_count": len(cs_concepts),
            "concepts": cs_concepts,
            "overall_retention": round(sum(c["retention"] for c in cs_concepts) / len(cs_concepts), 4) if cs_concepts else 1.0,
        },
        {
            "id": "ai_machine_learning",
            "name": "AI & Data Science",
            "category": "Artificial Intelligence",
            "description": "Supervised Learning, Neural Networks, Statistical Modeling & NLP.",
            "concept_count": 2,
            "concepts": [
                {"id": "ml_fundamentals", "name": "ML Fundamentals", "retention": 1.0, "status": "stable", "strength": 6.0},
                {"id": "neural_networks", "name": "Neural Networks", "retention": 1.0, "status": "stable", "strength": 4.5},
            ],
            "overall_retention": 1.0,
        }
    ]

    return jsonify({"learner_id": learner_id, "subjects": subjects})


@subjects_bp.get("/api/subjects/<subject_id>")
def get_subject(subject_id):
    learner_id = request.args.get("learner_id", "L_HARIHARAN")
    concepts = store.list_concepts(learner_id) or []
    current_day = store.get_current_day()

    topic_list = []
    for c in concepts:
        days_since = current_day - c["last_review"]
        r = round(ebbinghaus.retention(c["strength"], days_since), 4)
        topic_list.append({
            "id": c["concept_id"],
            "topic_id": c["concept_id"],
            "name": c["name"],
            "title": c["name"],
            "retention": r,
            "status": ebbinghaus.status_for(r),
            "strength": c["strength"],
            "last_review": c["last_review"],
            "difficulty": c.get("difficulty", 0.5),
            "question_count": 10,
        })

    subject = {
        "id": subject_id,
        "subject_id": subject_id,
        "name": "Computer Science Core" if subject_id == "computer_science" else subject_id.replace("_", " ").title(),
        "category": "Technology & Engineering",
        "topics": topic_list,
        "concepts": topic_list,
        "overall_retention": round(sum(t["retention"] for t in topic_list) / len(topic_list), 4) if topic_list else 1.0,
    }
    return jsonify(subject)


@subjects_bp.post("/api/subjects")
def create_subject():
    data = request.get_json() or {}
    learner_id = data.get("learner_id", "L_HARIHARAN")
    name = data.get("name") or data.get("title") or "New Subject"
    subject_id = name.lower().replace(" ", "_")

    return jsonify({
        "success": True,
        "id": subject_id,
        "subject_id": subject_id,
        "name": name,
        "category": data.get("category", "General"),
        "topics": [],
        "concepts": [],
    }), 201


@subjects_bp.post("/api/subjects/<subject_id>/topics")
def create_topic(subject_id):
    data = request.get_json() or {}
    name = data.get("name") or data.get("title") or "New Topic"
    learner_id = data.get("learner_id", "L_HARIHARAN")

    # Add concept to store
    res = store.add_concept(learner_id, name, float(data.get("difficulty", 0.5)))
    topic_id = res["concept_id"] if res else name.lower().replace(" ", "_")

    return jsonify({
        "success": True,
        "id": topic_id,
        "topic_id": topic_id,
        "name": name,
        "subject_id": subject_id,
        "strength": 6.0,
        "retention": 1.0,
        "status": "stable",
    }), 201
