import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app import create_app
from storage import store


@pytest.fixture
def client():
    store.reset()
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c
    store.reset()


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_list_learners(client):
    res = client.get("/api/learners")
    assert res.status_code == 200
    ids = [l["learner_id"] for l in res.get_json()["learners"]]
    assert "L_HARIHARAN" in ids


def test_list_concepts(client):
    res = client.get("/api/concepts?learner_id=L_HARIHARAN")
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["concepts"]) == 5


def test_predict_by_learner_concept(client):
    res = client.post("/api/retention/predict", json={
        "learner_id": "L_HARIHARAN", "concept_id": "data_structures"
    })
    assert res.status_code == 200
    body = res.get_json()
    assert 0 <= body["retention_formula"] <= 1
    assert "curve" in body


def test_predict_raw_features(client):
    res = client.post("/api/retention/predict", json={
        "difficulty": 0.5, "days_since_last_review": 5,
        "quiz_accuracy": 0.7, "response_time": 12.0, "attempt_count": 2
    })
    assert res.status_code == 200
    assert "retention" in res.get_json()


def test_weak_concepts(client):
    res = client.get("/api/concepts/weak?learner_id=L_HARIHARAN")
    assert res.status_code == 200
    body = res.get_json()
    for c in body["weak_concepts"]:
        assert c["status"] in ("weak", "critical")


def test_schedule_generate(client):
    res = client.post("/api/schedule/generate", json={"learner_id": "L_HARIHARAN"})
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["schedule"]) == 5
    due = [s["due_in_days"] for s in body["schedule"]]
    assert due == sorted(due)


def test_quiz_submit_correct_increases_strength(client):
    before = client.post("/api/retention/predict", json={
        "learner_id": "L_HARIHARAN", "concept_id": "data_structures"
    }).get_json()["strength"]

    res = client.post("/api/quiz/submit", json={
        "learner_id": "L_HARIHARAN", "concept_id": "data_structures", "correct": True
    })
    assert res.status_code == 200
    body = res.get_json()
    assert body["new_strength"] > before


def test_quiz_submit_wrong_decreases_strength(client):
    res = client.post("/api/quiz/submit", json={
        "learner_id": "L_HARIHARAN", "concept_id": "dbms_normalization", "correct": False
    })
    assert res.status_code == 200
    body = res.get_json()
    assert body["new_strength"] < body["previous_strength"]


def test_day_advance(client):
    res = client.post("/api/day/advance", json={"by": 3})
    assert res.status_code == 200
    assert res.get_json()["current_day"] == 3


def test_legacy_schema_migration(tmp_path, monkeypatch):
    import json
    from config import Config
    legacy_file = os.path.join(tmp_path, "legacy_db.json")
    legacy_data = {
        "current_day": 0,
        "learners": {
            "L_OLD": {
                "name": "Old Student",
                "concepts": {
                    "ds": {"name": "Data Structures", "strength": 5.0, "last_review": 0, "difficulty": 0.4}
                }
            }
        }
    }
    with open(legacy_file, "w") as f:
        json.dump(legacy_data, f)

    monkeypatch.setattr(Config, "STORAGE_FILE", legacy_file)
    monkeypatch.setattr(Config, "STORAGE_BACKEND", "json")

    data = store._read()
    assert "history" in data["learners"]["L_OLD"]
    c = data["learners"]["L_OLD"]["concepts"]["ds"]
    assert c["review_count"] == 0
    assert c["correct_count"] == 0
    assert c["avg_response_time"] is None
    assert c["rolling_quiz_accuracy"] is None
    assert c["quiz_history"] == []


def test_quiz_submit_with_response_time_and_history_cap(client):
    for i in range(25):
        res = client.post("/api/quiz/submit", json={
            "learner_id": "L_HARIHARAN",
            "concept_id": "data_structures",
            "correct": i % 2 == 0,
            "response_time": 10.0 + (i % 5),
        })
        assert res.status_code == 200

    concept = store.get_concept("L_HARIHARAN", "data_structures")
    assert concept["review_count"] == 25
    assert len(concept["quiz_history"]) == 20
    assert concept["rolling_quiz_accuracy"] is not None
    assert concept["avg_response_time"] is not None


def test_predict_returns_features_used(client):
    client.post("/api/quiz/submit", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
        "correct": True,
        "response_time": 8.5,
    })
    res = client.post("/api/retention/predict", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
    })
    assert res.status_code == 200
    body = res.get_json()
    assert "features_used" in body
    assert body["features_used"]["quiz_accuracy"] == 1.0
    assert body["features_used"]["response_time"] == 8.5
    assert body["features_used"]["attempt_count"] == 1


def test_analytics_endpoint(client):
    res = client.get("/api/analytics?learner_id=L_HARIHARAN")
    assert res.status_code == 200
    body = res.get_json()
    assert body["learner_id"] == "L_HARIHARAN"
    assert "overall_retention" in body
    assert "counts" in body
    assert "stable" in body["counts"]
    assert "review_count" in body
    assert "per_concept" in body
    assert "trend" in body
    assert len(body["per_concept"]) == 5


def test_quiz_questions_no_leakage(client):
    res = client.get("/api/quiz/questions?learner_id=L_HARIHARAN&concept_id=data_structures&limit=5")
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["questions"]) == 5
    for q in body["questions"]:
        assert "id" in q
        assert "text" in q
        assert "options" in q
        assert "correct" not in q
        assert "explanation" not in q


def test_quiz_attempt_server_side_grading(client):
    # Fetch questions to get valid question_id
    q_res = client.get("/api/quiz/questions?learner_id=L_HARIHARAN&concept_id=data_structures&limit=1")
    q = q_res.get_json()["questions"][0]
    q_id = q["id"]

    # Test wrong attempt
    res_wrong = client.post("/api/quiz/attempt", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
        "question_id": q_id,
        "selected_option": 3 if q_id != "ds_q01" else 0,  # wrong option
        "response_time": 15.0,
    })
    assert res_wrong.status_code == 200
    body_w = res_wrong.get_json()
    assert "correct" in body_w
    assert "correct_option" in body_w
    assert "explanation" in body_w

    # Test correct attempt with ds_q01 (correct_option is 1)
    res_correct = client.post("/api/quiz/attempt", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
        "question_id": "ds_q01",
        "selected_option": 1,
        "response_time": 5.0,
    })
    assert res_correct.status_code == 200
    body_c = res_correct.get_json()
    assert body_c["correct"] is True
    assert body_c["new_strength"] > body_c["previous_strength"]


def test_quiz_attempt_invalid_inputs(client):
    # Unknown question_id
    res1 = client.post("/api/quiz/attempt", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
        "question_id": "non_existent_q",
        "selected_option": 0,
    })
    assert res1.status_code == 404

    # selected_option out of range
    res2 = client.post("/api/quiz/attempt", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
        "question_id": "ds_q01",
        "selected_option": 99,
    })
    assert res2.status_code == 400


def test_scheduler_overdue_sorting(client):
    client.post("/api/day/advance", json={"by": 30})
    res = client.post("/api/schedule/generate", json={"learner_id": "L_HARIHARAN"})
    assert res.status_code == 200
    body = res.get_json()
    assert body["overdue_count"] == 5
    assert len(body["schedule"]) == 5
    for item in body["schedule"]:
        assert item["overdue"] is True
        assert item["days_overdue"] > 0
    # Overdue items sorted by days_overdue descending
    overdue_days = [item["days_overdue"] for item in body["schedule"]]
    assert overdue_days == sorted(overdue_days, reverse=True)


def test_predictor_model_version_fields(client):
    res = client.post("/api/retention/predict", json={
        "difficulty": 0.5, "days_since_last_review": 5,
        "quiz_accuracy": 0.7, "response_time": 12.0, "attempt_count": 2
    })
    assert res.status_code == 200
    body = res.get_json()
    assert "model_version" in body
    assert "sklearn_version" in body



