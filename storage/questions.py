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


def get_questions_for_concept(concept_id: str):
    bank = _load_questions()
    return bank.get(concept_id, [])


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
