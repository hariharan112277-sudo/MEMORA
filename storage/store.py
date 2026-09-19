"""
Persistence layer for learners, concepts, and their current memory state
(strength S, last-reviewed day).

Two backends:
  - "json"  (default): reads/writes storage/db.json — zero setup, good for
    local development and the PBL demo.
  - "mongo": uses MongoDB via pymongo if STORAGE_BACKEND=mongo and MONGO_URI
    is reachable.

Both expose the same functions, so routes never need to know which one is
active.
"""

import json
import os
import threading
from copy import deepcopy

from config import Config

_lock = threading.Lock()

SEED_DATA = {
    "current_day": 0,
    "learners": {
        "L_HARIHARAN": {
            "name": "S R Hariharan",
            "registration_no": "2104251040818",
            "concepts": {
                "data_structures": {"name": "Data Structures", "strength": 9.0, "last_review": 0, "difficulty": 0.4},
                "operating_systems": {"name": "Operating Systems", "strength": 4.0, "last_review": 0, "difficulty": 0.6},
                "dbms_normalization": {"name": "DBMS Normalization", "strength": 2.5, "last_review": 0, "difficulty": 0.7},
                "ml_fundamentals": {"name": "ML Fundamentals", "strength": 6.0, "last_review": 0, "difficulty": 0.5},
                "computer_networks": {"name": "Computer Networks", "strength": 3.2, "last_review": 0, "difficulty": 0.55},
            },
        },
        "L_AGHILAN": {
            "name": "Aghilan M",
            "registration_no": "2104251040043",
            "concepts": {
                "oop_concepts": {"name": "OOP Concepts", "strength": 8.0, "last_review": 0, "difficulty": 0.35},
                "algorithm_design": {"name": "Algorithm Design", "strength": 5.0, "last_review": 0, "difficulty": 0.5},
                "probability_stats": {"name": "Probability & Stats", "strength": 2.8, "last_review": 0, "difficulty": 0.65},
                "neural_networks": {"name": "Neural Networks", "strength": 4.5, "last_review": 0, "difficulty": 0.6},
                "software_engineering": {"name": "Software Engineering", "strength": 7.0, "last_review": 0, "difficulty": 0.4},
            },
        },
    },
}


def _migrate(data: dict) -> dict:
    if not isinstance(data, dict):
        return data
    if "learners" not in data or not isinstance(data["learners"], dict):
        data["learners"] = {}
    for lid, learner in data["learners"].items():
        if "history" not in learner or not isinstance(learner["history"], list):
            learner["history"] = []
        if "concepts" not in learner or not isinstance(learner["concepts"], dict):
            learner["concepts"] = {}
        for cid, concept in learner["concepts"].items():
            if "review_count" not in concept:
                concept["review_count"] = 0
            if "correct_count" not in concept:
                concept["correct_count"] = 0
            if "avg_response_time" not in concept:
                concept["avg_response_time"] = None
            if "rolling_quiz_accuracy" not in concept:
                concept["rolling_quiz_accuracy"] = None
            if "quiz_history" not in concept:
                concept["quiz_history"] = []
    return data


# ---------------------------------------------------------------- JSON backend

def _read_json():
    if not os.path.exists(Config.STORAGE_FILE):
        _write_json(deepcopy(SEED_DATA))
    with open(Config.STORAGE_FILE, "r") as f:
        data = json.load(f)
    return _migrate(data)


def _write_json(data):
    os.makedirs(os.path.dirname(Config.STORAGE_FILE), exist_ok=True)
    with open(Config.STORAGE_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ---------------------------------------------------------------- Mongo backend
_mongo_client = None
_mongo_db = None


def _get_mongo():
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        from pymongo import MongoClient
        _mongo_client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=2000)
        _mongo_client.admin.command("ping")  # raises if unreachable
        _mongo_db = _mongo_client[Config.MONGO_DB]
        if _mongo_db.state.count_documents({}) == 0:
            _mongo_db.state.insert_one({"_id": "singleton", **deepcopy(SEED_DATA)})
    return _mongo_db


def _read_mongo():
    db = _get_mongo()
    doc = db.state.find_one({"_id": "singleton"})
    if doc is not None:
        doc.pop("_id", None)
    return _migrate(doc or deepcopy(SEED_DATA))


def _write_mongo(data):
    db = _get_mongo()
    db.state.replace_one({"_id": "singleton"}, {"_id": "singleton", **data}, upsert=True)


# ---------------------------------------------------------------- Public API

def _read():
    if Config.STORAGE_BACKEND == "mongo":
        return _read_mongo()
    return _read_json()


def _write(data):
    if Config.STORAGE_BACKEND == "mongo":
        _write_mongo(data)
    else:
        _write_json(data)


def list_learners():
    data = _read()
    return [
        {"learner_id": lid, "name": info["name"], "registration_no": info.get("registration_no", "")}
        for lid, info in data["learners"].items()
    ]


def get_current_day():
    return _read().get("current_day", 0)


def advance_day(by: int = 1):
    with _lock:
        from ml import ebbinghaus
        data = _read()
        new_day = data.get("current_day", 0) + by
        data["current_day"] = new_day

        for lid, learner in data["learners"].items():
            h = learner.get("history", [])
            for cid, concept in learner.get("concepts", {}).items():
                days_since = new_day - concept.get("last_review", 0)
                ret = ebbinghaus.retention(concept.get("strength", 1.0), days_since)
                h.append({
                    "day": new_day,
                    "concept_id": cid,
                    "retention": round(ret, 4)
                })
            learner["history"] = h[-90:]

        _write(data)
        return data["current_day"]


def get_learner(learner_id: str):
    data = _read()
    learner = data["learners"].get(learner_id)
    if learner is None:
        return None
    return {"learner_id": learner_id, "current_day": data.get("current_day", 0), **learner}


def get_concept(learner_id: str, concept_id: str):
    learner = get_learner(learner_id)
    if learner is None:
        return None
    concept = learner["concepts"].get(concept_id)
    if concept is None:
        return None
    return {"concept_id": concept_id, **concept}


def list_concepts(learner_id: str):
    learner = get_learner(learner_id)
    if learner is None:
        return None
    return [{"concept_id": cid, **c} for cid, c in learner["concepts"].items()]


def update_concept(learner_id: str, concept_id: str, strength: float, last_review: int):
    with _lock:
        data = _read()
        learner = data["learners"].get(learner_id)
        if learner is None or concept_id not in learner["concepts"]:
            return None
        learner["concepts"][concept_id]["strength"] = strength
        learner["concepts"][concept_id]["last_review"] = last_review
        _write(data)
        return {"concept_id": concept_id, **learner["concepts"][concept_id]}


def add_quiz_result(learner_id: str, concept_id: str, correct: bool, response_time: float = None, question_id: str = None):
    with _lock:
        from ml import ebbinghaus
        data = _read()
        learner = data["learners"].get(learner_id)
        if learner is None or concept_id not in learner["concepts"]:
            return None
        concept = learner["concepts"][concept_id]

        concept["review_count"] = concept.get("review_count", 0) + 1
        if correct:
            concept["correct_count"] = concept.get("correct_count", 0) + 1

        entry = {
            "day": data.get("current_day", 0),
            "correct": bool(correct),
        }
        if response_time is not None:
            entry["response_time"] = float(response_time)
        if question_id is not None:
            entry["question_id"] = str(question_id)

        qh = concept.get("quiz_history", [])
        qh.append(entry)
        concept["quiz_history"] = qh[-20:]

        recent_10 = concept["quiz_history"][-10:]
        if recent_10:
            correct_10 = [1.0 if item["correct"] else 0.0 for item in recent_10]
            concept["rolling_quiz_accuracy"] = round(sum(correct_10) / len(correct_10), 4)
        else:
            concept["rolling_quiz_accuracy"] = None

        timed_attempts = [item["response_time"] for item in concept["quiz_history"] if item.get("response_time") is not None]
        if timed_attempts:
            concept["avg_response_time"] = round(sum(timed_attempts) / len(timed_attempts), 2)
        else:
            concept["avg_response_time"] = None

        old_strength = concept["strength"]
        new_strength = ebbinghaus.update_strength(old_strength, bool(correct), concept.get("difficulty", 0.5))
        concept["strength"] = new_strength
        concept["last_review"] = data.get("current_day", 0)

        _write(data)

        return {
            "learner_id": learner_id,
            "concept_id": concept_id,
            "correct": bool(correct),
            "previous_strength": round(old_strength, 2),
            "new_strength": round(new_strength, 2),
            "last_review": concept["last_review"],
            "retention_now": round(ebbinghaus.retention(new_strength, 0), 4),
            "next_review_estimate_days": round(ebbinghaus.days_until_threshold(new_strength), 1),
            "review_count": concept["review_count"],
            "rolling_quiz_accuracy": concept["rolling_quiz_accuracy"],
            "avg_response_time": concept["avg_response_time"],
        }


def reset():
    """Reset storage back to the seed demo data (useful for re-running demos)."""
    with _lock:
        _write(deepcopy(SEED_DATA))

