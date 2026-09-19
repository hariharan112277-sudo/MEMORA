from flask import Blueprint, jsonify, request
from ml import ebbinghaus
from storage import store

subjects_bp = Blueprint("subjects", __name__)

# Complete multi-discipline subject catalog
SUBJECT_CATALOG = {
    "cs": {
        "id": "cs",
        "subject_id": "cs",
        "name": "Computer Science Core",
        "category": "Technology & Engineering",
        "color": "indigo",
        "description": "Data structures, algorithms, operating systems, networking and database fundamentals.",
        "topics": [
            {"id": "data_structures", "name": "Data Structures & Trees", "module": "Data Structures", "strength": 9.0, "last_review": 0, "difficulty": 0.4, "question_count": 10},
            {"id": "ds_hashtables", "name": "Hash Tables & Collisions", "module": "Data Structures", "strength": 12.0, "last_review": 0, "difficulty": 0.5, "question_count": 8},
            {"id": "bigo_notation", "name": "Big-O Asymptotic Complexity", "module": "Algorithms", "strength": 6.0, "last_review": 0, "difficulty": 0.3, "question_count": 8},
            {"id": "operating_systems", "name": "Operating Systems & Process Sched", "module": "Operating Systems", "strength": 4.0, "last_review": 0, "difficulty": 0.6, "question_count": 10},
            {"id": "dbms_normalization", "name": "DBMS Normalization & Relational", "module": "Databases", "strength": 2.5, "last_review": 0, "difficulty": 0.7, "question_count": 8},
            {"id": "computer_networks", "name": "Computer Networks & TCP Handshake", "module": "Networking", "strength": 3.2, "last_review": 0, "difficulty": 0.55, "question_count": 10},
        ],
    },
    "med": {
        "id": "med",
        "subject_id": "med",
        "name": "Medical Physiology & Pharma",
        "category": "Medical & Healthcare",
        "color": "rose",
        "description": "Cardiovascular, renal physiology, pharmacokinetics and clinical diagnostic essentials.",
        "topics": [
            {"id": "cardiac_cycle", "name": "Cardiac Cycle & Pressure Dynamics", "module": "Cardiovascular", "strength": 7.0, "last_review": 0, "difficulty": 0.7, "question_count": 8},
            {"id": "nephron_physiology", "name": "Nephron Physiology & Transporters", "module": "Renal Physiology", "strength": 10.0, "last_review": 0, "difficulty": 0.5, "question_count": 8},
            {"id": "pharmacokinetics", "name": "Pharmacokinetics & Half-Life Bioavailability", "module": "Pharmacology", "strength": 14.0, "last_review": 0, "difficulty": 0.45, "question_count": 8},
        ],
    },
    "law": {
        "id": "law",
        "subject_id": "law",
        "name": "Contract & Tort Law",
        "category": "Law & Jurisprudence",
        "color": "amber",
        "description": "Common-law foundations of agreement, negligence, civil duties and liability.",
        "topics": [
            {"id": "negligence_elements", "name": "Elements of Negligence & Duty of Care", "module": "Torts", "strength": 5.0, "last_review": 0, "difficulty": 0.6, "question_count": 6},
            {"id": "offer_acceptance", "name": "Offer, Acceptance & Consideration", "module": "Contracts", "strength": 8.0, "last_review": 0, "difficulty": 0.4, "question_count": 6},
        ],
    },
    "lang": {
        "id": "lang",
        "subject_id": "lang",
        "name": "Linguistics & Languages",
        "category": "Languages",
        "color": "emerald",
        "description": "Grammatical cases, syntax trees, Japanese JLPT N3 vocabulary & phonetics.",
        "topics": [
            {"id": "japanese_n3", "name": "Japanese JLPT N3 Grammar & Kanji", "module": "Japanese", "strength": 11.0, "last_review": 0, "difficulty": 0.5, "question_count": 10},
            {"id": "grammatical_cases", "name": "Grammatical Cases & Morphosyntax", "module": "Linguistics", "strength": 6.5, "last_review": 0, "difficulty": 0.55, "question_count": 8},
        ],
    },
}


def _enrich_topics(learner_id, topics, current_day):
    # Cross reference with learner's store concepts if present
    concepts_map = {c["concept_id"]: c for c in (store.list_concepts(learner_id) or [])}
    enriched = []
    for t in topics:
        tid = t["id"]
        store_c = concepts_map.get(tid)
        strength = store_c["strength"] if store_c else t["strength"]
        last_rev = store_c["last_review"] if store_c else t["last_review"]
        days_since = current_day - last_rev
        r = round(ebbinghaus.retention(strength, days_since), 4)
        
        enriched.append({
            "id": tid,
            "topic_id": tid,
            "name": t["name"],
            "title": t["name"],
            "module": t.get("module", "General"),
            "strength": strength,
            "last_review": last_rev,
            "retention": r,
            "status": ebbinghaus.status_for(r),
            "difficulty": t.get("difficulty", 0.5),
            "question_count": t.get("question_count", 8),
        })
    return enriched


@subjects_bp.get("/api/subjects")
def list_subjects():
    learner_id = request.args.get("learner_id", "L_HARIHARAN")
    current_day = store.get_current_day()

    out_subjects = []
    for key, s in SUBJECT_CATALOG.items():
        topics = _enrich_topics(learner_id, s["topics"], current_day)
        avg_r = round(sum(t["retention"] for t in topics) / len(topics), 4) if topics else 1.0
        out_subjects.append({
            "id": s["id"],
            "subject_id": s["id"],
            "key": s["id"],
            "name": s["name"],
            "title": s["name"],
            "category": s["category"],
            "color": s["color"],
            "description": s["description"],
            "concept_count": len(topics),
            "topics_count": len(topics),
            "topics": topics,
            "concepts": topics,
            "overall_retention": avg_r,
            "average_retention": avg_r,
        })

    return jsonify({"learner_id": learner_id, "subjects": out_subjects, "data": out_subjects})


@subjects_bp.get("/api/subjects/<subject_id>")
def get_subject(subject_id):
    learner_id = request.args.get("learner_id", "L_HARIHARAN")
    current_day = store.get_current_day()

    s = SUBJECT_CATALOG.get(subject_id)
    if not s:
        # Fallback for dynamic user-created subject
        s = {
            "id": subject_id,
            "subject_id": subject_id,
            "name": subject_id.replace("_", " ").title(),
            "category": "Custom Course",
            "color": "indigo",
            "description": "User created custom course syllabus.",
            "topics": [
                {"id": f"{subject_id}_topic_1", "name": f"{subject_id.replace('_', ' ').title()} Fundamentals", "strength": 5.0, "last_review": 0}
            ]
        }

    topics = _enrich_topics(learner_id, s["topics"], current_day)
    avg_r = round(sum(t["retention"] for t in topics) / len(topics), 4) if topics else 1.0

    return jsonify({
        "id": s["id"],
        "subject_id": s["id"],
        "name": s["name"],
        "title": s["name"],
        "category": s["category"],
        "color": s.get("color", "indigo"),
        "description": s.get("description", ""),
        "topics": topics,
        "concepts": topics,
        "overall_retention": avg_r,
        "average_retention": avg_r,
    })


@subjects_bp.post("/api/subjects")
def create_subject():
    data = request.get_json() or {}
    learner_id = data.get("learner_id", "L_HARIHARAN")
    name = data.get("name") or data.get("title") or "New Subject"
    subject_id = name.lower().replace(" ", "_")

    new_sub = {
        "id": subject_id,
        "subject_id": subject_id,
        "name": name,
        "title": name,
        "category": data.get("category", "General"),
        "color": data.get("color", "indigo"),
        "description": data.get("description", ""),
        "topics": [],
        "concepts": [],
        "overall_retention": 1.0,
    }
    SUBJECT_CATALOG[subject_id] = new_sub

    return jsonify({"success": True, "subject": new_sub, **new_sub}), 201


@subjects_bp.post("/api/subjects/<subject_id>/topics")
def create_topic(subject_id):
    data = request.get_json() or {}
    name = data.get("name") or data.get("title") or "New Topic"
    learner_id = data.get("learner_id", "L_HARIHARAN")

    res = store.add_concept(learner_id, name, float(data.get("difficulty", 0.5)))
    topic_id = res["concept_id"] if res else name.lower().replace(" ", "_")

    new_topic = {
        "id": topic_id,
        "topic_id": topic_id,
        "name": name,
        "module": data.get("module", "General"),
        "strength": 6.0,
        "last_review": store.get_current_day(),
        "difficulty": float(data.get("difficulty", 0.5)),
        "question_count": 5,
    }

    if subject_id in SUBJECT_CATALOG:
        SUBJECT_CATALOG[subject_id]["topics"].append(new_topic)

    return jsonify({"success": True, "topic": new_topic, **new_topic}), 201
