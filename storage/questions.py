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


def generate_fallback_questions(concept_id: str):
    title = str(concept_id).replace("_", " ").title()
    return [
        {
            "id": f"{concept_id}_q1",
            "text": f"What is the primary objective when mastering {title}?",
            "prompt": f"What is the primary objective when mastering {title}?",
            "options": [
                f"Understanding core mechanics and principles of {title}",
                f"Memorizing arbitrary facts without practical application",
                f"Ignoring foundational concepts of {title}",
                f"Reviewing {title} only after complete memory decay"
            ],
            "correct": 0,
            "explanation": f"Understanding the core mechanics and principles provides long-term retention of {title}."
        },
        {
            "id": f"{concept_id}_q2",
            "text": f"Which strategy best improves retention for {title}?",
            "prompt": f"Which strategy best improves retention for {title}?",
            "options": [
                "Cramming all details in a single passive session",
                "Spaced repetition timed to predicted forgetting curves",
                "Reading the overview once without active testing",
                "Skipping practice questions and daily review queues"
            ],
            "correct": 1,
            "explanation": "Spaced repetition timed to your cognitive forgetting curve reinforces memory strength efficiently."
        },
        {
            "id": f"{concept_id}_q3",
            "text": f"How does accurate recall affect the memory strength of {title}?",
            "prompt": f"How does accurate recall affect the memory strength of {title}?",
            "options": [
                "Accurate recall increases stability S and delays decay",
                "Recall accuracy has zero effect on memory strength",
                "Incorrect answers increase predicted retention rate",
                "Recall time is ignored by modern cognitive models"
            ],
            "correct": 0,
            "explanation": "Correct answers strengthen memory stability S and extend the time before retention drops below 80%."
        },
        {
            "id": f"{concept_id}_q4",
            "text": f"What is the key indicator of fluency in {title}?",
            "prompt": f"What is the key indicator of fluency in {title}?",
            "options": [
                "Consistent fast recall with high accuracy across reviews",
                "High response times over 30 seconds per question",
                "Low memory strength with frequent overdue alerts",
                "Reviewing the topic only once per year"
            ],
            "correct": 0,
            "explanation": "Fast, accurate recall indicates high cognitive fluency and robust long-term retention."
        },
        {
            "id": f"{concept_id}_q5",
            "text": f"When should you schedule the next review session for {title}?",
            "prompt": f"When should you schedule the next review session for {title}?",
            "options": [
                "Just before retention falls below the target threshold",
                "Immediately 5 minutes after finishing the first quiz",
                "Only after forgetting 100% of the learned content",
                "At completely random intervals without tracking decay"
            ],
            "correct": 0,
            "explanation": "Reviewing just as retention approaches 80% maximizes memory consolidation efficiency."
        }
    ]


import threading

_QUESTIONS_LOCK = threading.Lock()


def _save_questions_unlocked(questions_data):
    global _QUESTIONS_CACHE
    _QUESTIONS_CACHE = questions_data
    q_path = os.path.join(Config.DATA_DIR, "questions.json")
    os.makedirs(os.path.dirname(q_path), exist_ok=True)
    with open(q_path, "w", encoding="utf-8") as f:
        json.dump(questions_data, f, indent=2)


def format_question_for_api(q):
    correct_idx = q.get("correct") if "correct" in q else q.get("correct_index", 0)
    diff_val = q.get("difficulty", 0.5)
    if isinstance(diff_val, (int, float)):
        diff_score = float(diff_val)
        if diff_score <= 0.35:
            diff_label = "easy"
        elif diff_score <= 0.6:
            diff_label = "medium"
        else:
            diff_label = "hard"
    else:
        diff_label = str(diff_val).lower()
        if diff_label == "easy":
            diff_score = 0.3
        elif diff_label == "medium":
            diff_score = 0.5
        else:
            diff_score = 0.8

    text = q.get("text") or q.get("prompt") or q.get("question") or ""

    return {
        "id": q.get("id"),
        "text": text,
        "question": text,
        "options": q.get("options", []),
        "correct": correct_idx,
        "correct_index": correct_idx,
        "explanation": q.get("explanation", "") or "",
        "difficulty": diff_label,
        "difficulty_score": diff_score,
    }


CONCEPT_ALIASES = {
    "probability_and_statistics": "probability_stats",
    "probability_stats": "probability_and_statistics",
}


def get_questions_for_concept(concept_id: str):
    bank = _load_questions()
    if concept_id in bank:
        return bank[concept_id]
    alias = CONCEPT_ALIASES.get(concept_id)
    if alias and alias in bank:
        return bank[alias]
    return bank.get(concept_id, [])


def get_questions_for_authoring(concept_id: str):
    with _QUESTIONS_LOCK:
        bank = _load_questions()
        qs = bank.get(concept_id)
        if not qs and concept_id in CONCEPT_ALIASES:
            qs = bank.get(CONCEPT_ALIASES[concept_id])
        if not qs:
            qs = generate_fallback_questions(concept_id)
        return [format_question_for_api(q) for q in qs]


def save_question_for_topic(concept_id: str, data: dict):
    with _QUESTIONS_LOCK:
        bank = _load_questions()
        qs = bank.get(concept_id, [])
        if not isinstance(qs, list):
            qs = []

        q_id = data.get("id") or f"q_{concept_id}_{int(random.random() * 1000000)}"
        text = (data.get("text") or data.get("question") or "").strip()
        options = [str(o).strip() for o in data.get("options", [])]
        correct_idx = data.get("correct_index") if "correct_index" in data else data.get("correct", 0)
        try:
            correct_idx = int(correct_idx)
        except (ValueError, TypeError):
            correct_idx = 0

        diff = data.get("difficulty", 0.5)
        if isinstance(diff, str):
            diff_str = diff.lower()
            diff_num = 0.3 if diff_str == "easy" else (0.5 if diff_str == "medium" else 0.8)
        else:
            try:
                diff_num = float(diff)
            except (ValueError, TypeError):
                diff_num = 0.5

        new_q = {
            "id": q_id,
            "text": text,
            "options": options,
            "correct": correct_idx,
            "explanation": data.get("explanation", "") or "",
            "difficulty": diff_num,
        }

        idx = next((i for i, q in enumerate(qs) if str(q.get("id")) == str(q_id)), -1)
        if idx >= 0:
            qs[idx] = new_q
        else:
            qs.append(new_q)

        bank[concept_id] = qs
        _save_questions_unlocked(bank)
        return format_question_for_api(new_q)


def update_question_by_id(question_id: str, data: dict):
    with _QUESTIONS_LOCK:
        bank = _load_questions()
        found_concept = None
        found_idx = -1
        for cid, qs in bank.items():
            for i, q in enumerate(qs):
                if str(q.get("id")) == str(question_id):
                    found_concept = cid
                    found_idx = i
                    break
            if found_concept:
                break

        if not found_concept or found_idx < 0:
            return None

        q = bank[found_concept][found_idx]
        text = (data.get("text") or data.get("question") or q.get("text") or "").strip()
        options = [str(o).strip() for o in data.get("options", q.get("options", []))]
        correct_idx = data.get("correct_index") if "correct_index" in data else data.get("correct", q.get("correct", 0))
        try:
            correct_idx = int(correct_idx)
        except (ValueError, TypeError):
            correct_idx = 0

        diff = data.get("difficulty", q.get("difficulty", 0.5))
        if isinstance(diff, str):
            diff_str = diff.lower()
            diff_num = 0.3 if diff_str == "easy" else (0.5 if diff_str == "medium" else 0.8)
        else:
            try:
                diff_num = float(diff)
            except (ValueError, TypeError):
                diff_num = 0.5

        updated_q = {
            "id": question_id,
            "text": text,
            "options": options,
            "correct": correct_idx,
            "explanation": data.get("explanation", q.get("explanation", "")),
            "difficulty": diff_num,
        }
        bank[found_concept][found_idx] = updated_q
        _save_questions_unlocked(bank)
        return format_question_for_api(updated_q)


def delete_question_by_id(question_id: str) -> bool:
    with _QUESTIONS_LOCK:
        bank = _load_questions()
        found_concept = None
        found_idx = -1
        for cid, qs in bank.items():
            for i, q in enumerate(qs):
                if str(q.get("id")) == str(question_id):
                    found_concept = cid
                    found_idx = i
                    break
            if found_concept:
                break

        if not found_concept or found_idx < 0:
            return False

        bank[found_concept].pop(found_idx)
        _save_questions_unlocked(bank)
        return True


def get_question(concept_id: str, question_id: str):
    questions = get_questions_for_concept(concept_id)
    if not questions:
        questions = generate_fallback_questions(concept_id)
    for q in questions:
        if str(q.get("id")) == str(question_id):
            return q
    return None


def sample_questions(concept_id: str, limit: int = 5):
    questions = get_questions_for_concept(concept_id)
    if not questions:
        questions = generate_fallback_questions(concept_id)
    limit = min(max(1, limit), 10)
    sampled = questions[:limit] if len(questions) <= limit else random.sample(questions, limit)

    sanitized = []
    for q in sampled:
        q_copy = deepcopy(q)
        q_copy["text"] = q_copy.get("text") or q_copy.get("prompt") or ""
        q_copy.pop("correct", None)
        q_copy.pop("explanation", None)
        sanitized.append(q_copy)

    return sanitized

