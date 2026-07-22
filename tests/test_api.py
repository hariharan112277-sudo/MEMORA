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
