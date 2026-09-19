from flask import Blueprint, jsonify, request

from ml import ebbinghaus
from storage import questions as questions_storage
from storage import store

quiz_bp = Blueprint("quiz", __name__)


@quiz_bp.get("/api/quiz/questions")
def get_questions():
    """
    Returns a list of questions for a concept without answer/explanation leakage.

    Query params: ?learner_id=L_HARIHARAN&concept_id=data_structures&limit=5
    """
    learner_id = request.args.get("learner_id")
    concept_id = request.args.get("concept_id")
    limit_param = request.args.get("limit", "5")

    if not learner_id or not concept_id:
        return jsonify({"error": "learner_id and concept_id parameters are required"}), 400

    concept = store.get_concept(learner_id, concept_id, auto_create=True)
    if concept is None:
        return jsonify({"error": f"Learner or concept '{concept_id}' not found"}), 404

    try:
        limit = int(limit_param)
    except ValueError:
        limit = 5

    questions = questions_storage.sample_questions(concept_id, limit=limit)
    return jsonify({
        "learner_id": learner_id,
        "concept_id": concept_id,
        "questions": questions,
    })


@quiz_bp.post("/api/quiz/attempt")
def attempt():
    """
    Evaluates a single question attempt server-side and updates memory stats.

    Body: { "learner_id": "L_HARIHARAN", "concept_id": "data_structures", "question_id": "ds_q01", "selected_option": 1, "response_time": 9.4 }
    """
    body = request.get_json(force=True, silent=True) or {}
    learner_id = body.get("learner_id")
    concept_id = body.get("concept_id") or body.get("topic_id")
    question_id = body.get("question_id")
    selected_option = body.get("selected_option")
    if selected_option is None:
        selected_option = body.get("selected_index")

    response_time = body.get("response_time")
    if response_time is None and body.get("time_ms") is not None:
        try:
            response_time = float(body.get("time_ms")) / 1000.0
        except (ValueError, TypeError):
            response_time = None

    if not learner_id or not concept_id or not question_id or selected_option is None:
        return jsonify({"error": "learner_id, concept_id, question_id and selected_option are required"}), 400

    try:
        selected_option = int(selected_option)
        if selected_option < 0 or selected_option > 3:
            return jsonify({"error": "selected_option must be an integer between 0 and 3"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "selected_option must be an integer between 0 and 3"}), 400

    if response_time is not None:
        try:
            response_time = float(response_time)
            if response_time < 0 or response_time > 600:
                return jsonify({"error": "response_time must be between 0 and 600 seconds"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "response_time must be a valid number"}), 400

    concept = store.get_concept(learner_id, concept_id)
    if concept is None:
        return jsonify({"error": f"Learner or concept '{concept_id}' not found"}), 404

    q_data = questions_storage.get_question(concept_id, question_id)
    if q_data is None:
        return jsonify({"error": f"Question '{question_id}' not found for concept '{concept_id}'"}), 404

    correct_option = q_data["correct"]
    is_correct = (selected_option == correct_option)

    result = store.add_quiz_result(
        learner_id, concept_id, is_correct, response_time=response_time, question_id=question_id
    )

    return jsonify({
        "learner_id": learner_id,
        "concept_id": concept_id,
        "question_id": question_id,
        "correct": is_correct,
        "correct_option": correct_option,
        "correct_index": correct_option,
        "explanation": q_data.get("explanation", ""),
        "previous_strength": result["previous_strength"],
        "new_strength": result["new_strength"],
        "last_review": result["last_review"],
        "retention_now": result["retention_now"],
        "next_review_estimate_days": result["next_review_estimate_days"],
        "rolling_quiz_accuracy": result["rolling_quiz_accuracy"],
        "review_count": result["review_count"],
    })


@quiz_bp.post("/api/quiz/submit")
def submit():
    """
    Submits a quiz result for a concept and updates its memory strength.

    Body: { "learner_id": "L_HARIHARAN", "concept_id": "data_structures", "correct": true, "response_time": 12.5 }
    """
    body = request.get_json(force=True, silent=True) or {}
    learner_id = body.get("learner_id")
    concept_id = body.get("concept_id")
    correct = body.get("correct")
    response_time = body.get("response_time")

    if not learner_id or not concept_id or correct is None:
        return jsonify({"error": "learner_id, concept_id and correct (bool) are required"}), 400

    if response_time is not None:
        try:
            response_time = float(response_time)
            if response_time < 0 or response_time > 600:
                return jsonify({"error": "response_time must be between 0 and 600 seconds"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "response_time must be a valid number"}), 400

    result = store.add_quiz_result(learner_id, concept_id, bool(correct), response_time=response_time)
    if result is None:
        return jsonify({"error": "learner or concept not found"}), 404

    return jsonify(result)
