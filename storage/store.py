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


# ---------------------------------------------------------------- JSON backend

def _read_json():
    if not os.path.exists(Config.STORAGE_FILE):
        _write_json(deepcopy(SEED_DATA))
    with open(Config.STORAGE_FILE, "r") as f:
        return json.load(f)


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
    doc.pop("_id", None)
    return doc


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
        data = _read()
        data["current_day"] = data.get("current_day", 0) + by
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


def reset():
    """Reset storage back to the seed demo data (useful for re-running demos)."""
    with _lock:
        _write(deepcopy(SEED_DATA))
