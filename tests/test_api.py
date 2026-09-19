import json
import os
import sys
from unittest.mock import MagicMock

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app import create_app
from config import Config
from storage import store


@pytest.fixture
def client():
    store.reset()
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c
    store.reset()


# ---------------------------------------------------------------- Health Tests
def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "ok"
    assert body["ml_model_loaded"] is True


def test_health_model_not_loaded(client, monkeypatch):
    from ml import predictor
    monkeypatch.setattr(predictor, "_load_model", lambda: None)
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["ml_model_loaded"] is False


# ---------------------------------------------------------------- Learners Tests
def test_list_learners(client):
    res = client.get("/api/learners")
    assert res.status_code == 200
    ids = [l["learner_id"] for l in res.get_json()["learners"]]
    assert "L_HARIHARAN" in ids
    assert "L_AGHILAN" in ids


def test_get_learner_success(client):
    res = client.get("/api/learners/L_HARIHARAN")
    assert res.status_code == 200
    body = res.get_json()
    assert body["name"] == "S R Hariharan"
    assert len(body["concepts"]) == 5


def test_get_learner_unknown(client):
    res = client.get("/api/learners/L_UNKNOWN")
    assert res.status_code == 404


# ---------------------------------------------------------------- Concepts Tests
def test_list_concepts(client):
    res = client.get("/api/concepts?learner_id=L_HARIHARAN")
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["concepts"]) == 5


def test_list_concepts_missing_learner(client):
    res = client.get("/api/concepts")
    assert res.status_code == 400


def test_list_concepts_unknown_learner(client):
    res = client.get("/api/concepts?learner_id=L_UNKNOWN")
    assert res.status_code == 404


# ---------------------------------------------------------------- Predict Tests
def test_predict_by_learner_concept(client):
    res = client.post("/api/retention/predict", json={
        "learner_id": "L_HARIHARAN", "concept_id": "data_structures"
    })
    assert res.status_code == 200
    body = res.get_json()
    assert 0 <= body["retention_formula"] <= 1
    assert "curve" in body
    assert "features_used" in body


def test_predict_unknown_learner_concept(client):
    res = client.post("/api/retention/predict", json={
        "learner_id": "L_HARIHARAN", "concept_id": "unknown_concept"
    })
    assert res.status_code == 404


def test_predict_raw_features(client):
    res = client.post("/api/retention/predict", json={
        "difficulty": 0.5, "days_since_last_review": 5,
        "quiz_accuracy": 0.7, "response_time": 12.0, "attempt_count": 2
    })
    assert res.status_code == 200
    body = res.get_json()
    assert "retention" in body
    assert body["method"] == "random_forest"
    assert "model_version" in body
    assert "sklearn_version" in body


def test_predict_raw_missing_fields(client):
    res = client.post("/api/retention/predict", json={
        "difficulty": 0.5, "days_since_last_review": 5
    })
    assert res.status_code == 400
    assert "missing fields" in res.get_json()["error"]


def test_predict_fallback_mode(client, monkeypatch):
    from ml import predictor
    monkeypatch.setattr(predictor, "_load_model", lambda: None)
    res = client.post("/api/retention/predict", json={
        "difficulty": 0.5, "days_since_last_review": 5,
        "quiz_accuracy": 0.7, "response_time": 12.0, "attempt_count": 2
    })
    assert res.status_code == 200
    assert res.get_json()["method"] == "ebbinghaus_fallback"


# ---------------------------------------------------------------- Weak Concepts Tests
def test_weak_concepts(client):
    res = client.get("/api/concepts/weak?learner_id=L_HARIHARAN")
    assert res.status_code == 200
    body = res.get_json()
    for c in body["weak_concepts"]:
        assert c["status"] in ("weak", "critical")


def test_weak_concepts_missing_learner(client):
    res = client.get("/api/concepts/weak")
    assert res.status_code == 400


def test_weak_concepts_unknown_learner(client):
    res = client.get("/api/concepts/weak?learner_id=L_UNKNOWN")
    assert res.status_code == 404


# ---------------------------------------------------------------- Scheduler Tests
def test_schedule_generate(client):
    res = client.post("/api/schedule/generate", json={"learner_id": "L_HARIHARAN"})
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["schedule"]) == 5
    assert "overdue_count" in body


def test_schedule_generate_missing_learner(client):
    res = client.post("/api/schedule/generate", json={})
    assert res.status_code == 400


def test_schedule_generate_unknown_learner(client):
    res = client.post("/api/schedule/generate", json={"learner_id": "L_UNKNOWN"})
    assert res.status_code == 404


def test_schedule_custom_threshold(client):
    res1 = client.post("/api/schedule/generate", json={"learner_id": "L_HARIHARAN", "threshold": 0.8})
    res2 = client.post("/api/schedule/generate", json={"learner_id": "L_HARIHARAN", "threshold": 0.5})
    assert res1.status_code == 200 and res2.status_code == 200
    due1 = sum(item["due_in_days"] for item in res1.get_json()["schedule"])
    due2 = sum(item["due_in_days"] for item in res2.get_json()["schedule"])
    # Lower threshold means we can wait longer before revision -> due_in_days higher
    assert due2 >= due1


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
    overdue_days = [item["days_overdue"] for item in body["schedule"]]
    assert overdue_days == sorted(overdue_days, reverse=True)


# ---------------------------------------------------------------- Quiz Submit Tests
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


def test_quiz_submit_missing_fields(client):
    res = client.post("/api/quiz/submit", json={"learner_id": "L_HARIHARAN"})
    assert res.status_code == 400


def test_quiz_submit_unknown_learner_concept(client):
    res = client.post("/api/quiz/submit", json={
        "learner_id": "L_UNKNOWN", "concept_id": "data_structures", "correct": True
    })
    assert res.status_code == 404


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


# ---------------------------------------------------------------- Question Bank Tests
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


def test_quiz_questions_missing_params(client):
    res = client.get("/api/quiz/questions?learner_id=L_HARIHARAN")
    assert res.status_code == 400


def test_quiz_questions_unknown_learner(client):
    res = client.get("/api/quiz/questions?learner_id=L_UNKNOWN&concept_id=data_structures")
    assert res.status_code == 404


def test_quiz_attempt_server_side_grading(client):
    q_res = client.get("/api/quiz/questions?learner_id=L_HARIHARAN&concept_id=data_structures&limit=1")
    q = q_res.get_json()["questions"][0]
    q_id = q["id"]

    res_wrong = client.post("/api/quiz/attempt", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
        "question_id": q_id,
        "selected_option": 3 if q_id != "ds_q01" else 0,
        "response_time": 15.0,
    })
    assert res_wrong.status_code == 200
    body_w = res_wrong.get_json()
    assert "correct" in body_w
    assert "correct_option" in body_w
    assert "explanation" in body_w

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
    res1 = client.post("/api/quiz/attempt", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
        "question_id": "non_existent_q",
        "selected_option": 0,
    })
    assert res1.status_code == 404

    res2 = client.post("/api/quiz/attempt", json={
        "learner_id": "L_HARIHARAN",
        "concept_id": "data_structures",
        "question_id": "ds_q01",
        "selected_option": 99,
    })
    assert res2.status_code == 400


# ---------------------------------------------------------------- Analytics Tests
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


def test_analytics_missing_learner(client):
    res = client.get("/api/analytics")
    assert res.status_code == 400


def test_analytics_unknown_learner(client):
    res = client.get("/api/analytics?learner_id=L_UNKNOWN")
    assert res.status_code == 404


# ---------------------------------------------------------------- Day Advance & Reset Tests
def test_day_advance(client):
    res = client.post("/api/day/advance", json={"by": 3})
    assert res.status_code == 200
    assert res.get_json()["current_day"] == 3


def test_reset_endpoint(client):
    client.post("/api/day/advance", json={"by": 10})
    client.post("/api/quiz/submit", json={"learner_id": "L_HARIHARAN", "concept_id": "data_structures", "correct": True})
    res = client.post("/api/reset")
    assert res.status_code == 200
    assert res.get_json()["current_day"] == 0

    learner = store.get_learner("L_HARIHARAN")
    assert learner["current_day"] == 0
    assert learner["concepts"]["data_structures"]["strength"] == 9.0


# ---------------------------------------------------------------- CRUD Lifecycle Tests
def test_learner_crud_lifecycle(client):
    create_res = client.post("/api/learners", json={"name": "Priya Sharma", "registration_no": "2104251040099"})
    assert create_res.status_code == 201
    lid = create_res.get_json()["learner_id"]
    assert lid == "L_PRIYA_SHARMA"

    create_res2 = client.post("/api/learners", json={"name": "Priya Sharma"})
    assert create_res2.status_code == 201
    lid2 = create_res2.get_json()["learner_id"]
    assert lid2 == "L_PRIYA_SHARMA-2"

    get_res = client.get(f"/api/learners/{lid}")
    assert get_res.status_code == 200
    assert get_res.get_json()["name"] == "Priya Sharma"

    bad_concept = client.post(f"/api/learners/{lid}/concepts", json={"name": "Graph Theory", "difficulty": 1.5})
    assert bad_concept.status_code == 400

    concept_res = client.post(f"/api/learners/{lid}/concepts", json={"name": "Graph Theory", "difficulty": 0.55})
    assert concept_res.status_code == 201
    cid = concept_res.get_json()["concept_id"]
    assert cid == "graph_theory"

    sched_res = client.post("/api/schedule/generate", json={"learner_id": lid})
    assert sched_res.status_code == 200
    assert len(sched_res.get_json()["schedule"]) == 1

    del_c_res = client.delete(f"/api/learners/{lid}/concepts/{cid}")
    assert del_c_res.status_code == 204

    del_l_res = client.delete(f"/api/learners/{lid}")
    assert del_l_res.status_code == 204

    assert client.get(f"/api/learners/{lid}").status_code == 404


# ---------------------------------------------------------------- Migration & Frontend Tests
def test_legacy_schema_migration(tmp_path, monkeypatch):
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


def test_dashboard_frontend_served(client):
    res = client.get("/dashboard")
    assert res.status_code == 200
    assert "text/html" in res.content_type
    assert b"MEMORA" in res.data


def test_store_mongo_backend_mongomock(monkeypatch):
    import mongomock
    mock_client = mongomock.MongoClient()

    def mock_get_mongo():
        db = mock_client[Config.MONGO_DB]
        if db.state.count_documents({}) == 0:
            db.state.insert_one({"_id": "singleton", **store.SEED_DATA})
        return db

    monkeypatch.setattr(Config, "STORAGE_BACKEND", "mongo")
    monkeypatch.setattr(store, "_get_mongo", mock_get_mongo)

    learners = store.list_learners()
    assert len(learners) >= 2
    res = store.add_quiz_result("L_HARIHARAN", "data_structures", True)
    assert res["correct"] is True
    store.reset()
    assert store.get_current_day() == 0
