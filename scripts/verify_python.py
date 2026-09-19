import requests
import sys

BASE = "http://localhost:5000"

endpoints = [
    ("GET", "/api/health", None, "ml_model_loaded"),
    ("GET", "/api/learners", None, "learners"),
    ("GET", "/api/concepts?learner_id=L_HARIHARAN", None, "concepts"),
    ("GET", "/api/analytics?learner_id=L_HARIHARAN", None, "overall_retention"),
    ("GET", "/api/concepts/weak?learner_id=L_HARIHARAN", None, "weak_concepts"),
    ("POST", "/api/retention/predict", {"learner_id": "L_HARIHARAN", "concept_id": "data_structures"}, "retention_formula"),
    ("POST", "/api/schedule/generate", {"learner_id": "L_HARIHARAN"}, "schedule"),
    ("GET", "/api/quiz/questions?learner_id=L_HARIHARAN&concept_id=data_structures&limit=2", None, "questions"),
    ("POST", "/api/quiz/attempt", {"learner_id": "L_HARIHARAN", "concept_id": "data_structures", "question_id": "ds_q01", "selected_option": 1, "response_time": 10.5}, "correct"),
    ("POST", "/api/day/advance", {"by": 1}, "current_day"),
    ("GET", "/dashboard", None, "MEMORA"),
    ("POST", "/api/reset", None, "status"),
]

print("Starting MEMORA API verification...")
for method, path, body, sig in endpoints:
    url = BASE + path
    if method == "GET":
        r = requests.get(url)
    else:
        r = requests.post(url, json=body or {})

    if r.status_code != 200:
        print(f"FAILED {method} {path}: HTTP {r.status_code}")
        sys.exit(1)

    if sig not in r.text:
        print(f"FAILED {method} {path}: Missing signature '{sig}'")
        sys.exit(1)

    print(f"[OK] {method} {path} -> HTTP 200 OK (found signature '{sig}')")

print("\nALL CHECKS PASSED SUCCESSFULLY!")
