from flask import Blueprint, jsonify, request
from storage import questions as questions_storage

topics_bp = Blueprint("topics", __name__)


@topics_bp.get("/api/topics/<concept_id>/questions")
def get_topic_questions(concept_id):
    qs = questions_storage.get_questions_for_authoring(concept_id)
    return jsonify({"questions": qs, "data": qs})


@topics_bp.post("/api/topics/<concept_id>/questions")
def create_topic_question(concept_id):
    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or body.get("question") or "").strip()
    if not text:
        return jsonify({"error": "Question text is required"}), 400

    options = body.get("options")
    if not isinstance(options, list) or len(options) < 2:
        return jsonify({"error": "Provide at least 2 non-empty options"}), 400

    cleaned_options = [str(o).strip() for o in options]
    if any(not o for o in cleaned_options):
        return jsonify({"error": "All options must be non-empty strings"}), 400

    correct = body.get("correct_index") if "correct_index" in body else body.get("correct")
    if correct is None or not isinstance(correct, int) or correct < 0 or correct >= len(cleaned_options):
        return jsonify({"error": f"correct_index must be an integer between 0 and {len(cleaned_options) - 1}"}), 400

    data = {
        "text": text,
        "options": cleaned_options,
        "correct_index": correct,
        "explanation": body.get("explanation", ""),
        "difficulty": body.get("difficulty", 0.5),
    }

    created = questions_storage.save_question_for_topic(concept_id, data)
    return jsonify(created), 201


@topics_bp.put("/api/questions/<question_id>")
def update_question(question_id):
    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or body.get("question") or "").strip()
    if not text:
        return jsonify({"error": "Question text is required"}), 400

    options = body.get("options")
    if options is not None:
        if not isinstance(options, list) or len(options) < 2:
            return jsonify({"error": "Provide at least 2 non-empty options"}), 400
        cleaned_options = [str(o).strip() for o in options]
        if any(not o for o in cleaned_options):
            return jsonify({"error": "All options must be non-empty strings"}), 400
        body["options"] = cleaned_options

    updated = questions_storage.update_question_by_id(question_id, body)
    if not updated:
        return jsonify({"error": "Question not found"}), 404

    return jsonify(updated), 200


@topics_bp.delete("/api/questions/<question_id>")
def delete_question(question_id):
    deleted = questions_storage.delete_question_by_id(question_id)
    if not deleted:
        return jsonify({"error": "Question not found"}), 404

    return jsonify({"deleted": True}), 200
