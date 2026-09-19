import json
import os
import random
from copy import deepcopy

from config import Config

_QUESTIONS_CACHE = None


def _load_questions():
    global _QUESTIONS_CACHE
    if _QUESTIONS_CACHE is None:
        q_path = os.path.join(Config.DATA_DIR, "questions.json")
        if os.path.exists(q_path):
            with open(q_path, "r", encoding="utf-8") as f:
                _QUESTIONS_CACHE = json.load(f)
        else:
            _QUESTIONS_CACHE = {}
    return _QUESTIONS_CACHE


def get_questions_for_concept(concept_id: str):
    bank = _load_questions()
    return bank.get(concept_id, [])


def get_question(concept_id: str, question_id: str):
    questions = get_questions_for_concept(concept_id)
    for q in questions:
        if q["id"] == question_id:
            return q
    return None


def sample_questions(concept_id: str, limit: int = 5):
    questions = get_questions_for_concept(concept_id)
    if not questions:
        return []

    limit = min(max(1, limit), 10)
    sampled = random.sample(questions, min(limit, len(questions)))

    sanitized = []
    for q in sampled:
        q_copy = deepcopy(q)
        # MUST NOT leak correct index or explanation to the client
        q_copy.pop("correct", None)
        q_copy.pop("explanation", None)
        sanitized.append(q_copy)

    return sanitized
