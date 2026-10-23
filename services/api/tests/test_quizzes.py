import pytest
from httpx import AsyncClient
from app.services.quiz_service import quiz_service
from app.models.document import Document
from sqlalchemy import select

@pytest.mark.asyncio
async def test_quiz_generation_and_zero_exposure_rule(client: AsyncClient, registered_user: dict, db_session):
    headers = registered_user["headers"]

    # 1. Upload sample educational document
    content = (
        "Neural Networks Architecture and Backpropagation\n\n"
        "Activation functions introduce non-linearities into neural networks. "
        "The Sigmoid function maps inputs to the range between 0 and 1, but suffers from vanishing gradients.\n\n"
        "ReLU (Rectified Linear Unit) avoids vanishing gradients for positive inputs and accelerates gradient convergence.\n\n"
        "Backpropagation computes the gradient of the loss function with respect to each weight using the chain rule."
    )
    files = {"file": ("neural_nets.txt", content.encode("utf-8"), "text/plain")}
    resp = await client.post("/api/v1/documents/upload", headers=headers, files=files, data={"title": "Neural Networks"})
    assert resp.status_code == 202
    doc_id = resp.json()["document_id"]

    # Poll until ready
    import asyncio
    for _ in range(30):
        st_res = await client.get(f"/api/v1/documents/{doc_id}/status", headers=headers)
        if st_res.status_code == 200 and st_res.json()["status"] == "READY":
            break
        await asyncio.sleep(0.1)

    # 2. Generate a 3-question quiz
    gen_payload = {
        "document_id": doc_id,
        "title": "Neural Networks Assessment",
        "subject": "Deep Learning",
        "difficulty": "medium",
        "question_count": 3,
        "duration_minutes": 15,
        "question_types": ["single_choice", "true_false", "short_answer"]
    }
    gen_resp = await client.post("/api/v1/quizzes/generate", headers=headers, json=gen_payload)
    if gen_resp.status_code != 202:
        print("GEN RESP FAILED:", gen_resp.status_code, gen_resp.json())
    assert gen_resp.status_code == 202
    quiz_id = gen_resp.json()["quiz_id"]

    # 3. Fetch quiz as student: VERIFY ZERO ANSWER EXPOSURE
    # Student must NOT receive is_correct flags, explanations, or secret rubrics!
    quiz_resp = await client.get(f"/api/v1/quizzes/{quiz_id}", headers=headers)
    assert quiz_resp.status_code == 200
    quiz_data = quiz_resp.json()
    assert quiz_data["id"] == quiz_id
    assert len(quiz_data["questions"]) >= 1

    for q in quiz_data["questions"]:
        # Verify explanation is stripped
        assert "explanation" not in q or q.get("explanation") is None
        assert "citation_quote" not in q or q.get("citation_quote") is None
        assert "rubric_criteria" not in q or q.get("rubric_criteria") is None

        # Verify options DO NOT contain is_correct
        for opt in q["options"]:
            assert "is_correct" not in opt
