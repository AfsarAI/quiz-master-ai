import pytest
from httpx import AsyncClient
from app.services.quiz_service import quiz_service

@pytest.mark.asyncio
async def test_full_examination_and_evaluation_lifecycle(client: AsyncClient, registered_user: dict, db_session):
    headers = registered_user["headers"]

    # 1. Ingest document
    content = (
        "Linear Algebra for Data Science.\n\n"
        "Eigenvalues and Eigenvectors are central to Principal Component Analysis (PCA). "
        "An eigenvector represents a direction along which a linear transformation acts by stretching or shrinking.\n\n"
        "The determinant of an identity matrix is always equal to 1. "
        "Orthogonal matrices have transpose equal to their inverse."
    )
    files = {"file": ("linear_algebra.txt", content.encode("utf-8"), "text/plain")}
    resp = await client.post("/api/v1/documents/upload", headers=headers, files=files, data={"title": "Linear Algebra"})
    assert resp.status_code == 202
    doc_id = resp.json()["document_id"]

    # Poll until document is READY
    import asyncio
    for _ in range(30):
        st_res = await client.get(f"/api/v1/documents/{doc_id}/status", headers=headers)
        if st_res.status_code == 200 and st_res.json()["status"] == "READY":
            break
        await asyncio.sleep(0.1)

    # 2. Generate quiz
    gen_payload = {
        "document_id": doc_id,
        "title": "Linear Algebra Examination",
        "subject": "Mathematics",
        "difficulty": "medium",
        "question_count": 2,
        "duration_minutes": 20,
        "question_types": ["single_choice", "short_answer"]
    }
    gen_resp = await client.post("/api/v1/quizzes/generate", headers=headers, json=gen_payload)
    quiz_id = gen_resp.json()["quiz_id"]

    # 3. Start attempt
    start_resp = await client.post("/api/v1/attempts/start", headers=headers, json={"quiz_id": quiz_id})
    assert start_resp.status_code == 201
    start_data = start_resp.json()
    attempt_id = start_data["attempt_id"]
    assert "expires_at" in start_data

    # Fetch quiz to get question IDs and student option IDs
    quiz_resp = await client.get(f"/api/v1/quizzes/{quiz_id}", headers=headers)
    questions = quiz_resp.json()["questions"]
    q1 = questions[0]
    q2 = questions[1]

    # 4. Submit answers
    # Submit first option for q1, and substantive text for q2
    answers = [
        {
            "question_id": q1["id"],
            "selected_option_ids": [q1["options"][0]["id"]] if q1["options"] else [],
            "text_response": None
        },
        {
            "question_id": q2["id"],
            "selected_option_ids": [],
            "text_response": "Eigenvectors identify directions of variance in principal component analysis."
        }
    ]
    submit_resp = await client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        headers=headers,
        json={"answers": answers}
    )
    assert submit_resp.status_code == 200
    res_card = submit_resp.json()
    assert res_card["attempt_id"] == attempt_id
    assert res_card["status"] == "EVALUATED"
    assert "total_score" in res_card
    assert "percentage" in res_card
    assert len(res_card["question_reviews"]) == 2

    # Verify citation info is provided upon evaluation
    rev1 = res_card["question_reviews"][0]
    assert rev1["citation"] is not None
    assert rev1["citation"]["source_document"] == "Linear Algebra"
    assert rev1["explanation"] != ""

    # 5. Check analytics summary
    analytics_resp = await client.get("/api/v1/analytics/summary", headers=headers)
    assert analytics_resp.status_code == 200
    analytics_data = analytics_resp.json()
    assert analytics_data["total_quizzes_taken"] >= 1
    assert "Mathematics" in analytics_data["mastery_by_subject"]

    # 6. Generate adaptive remediation quiz
    adapt_resp = await client.post(
        "/api/v1/analytics/adaptive-quiz",
        headers=headers,
        json={"subject": "Mathematics", "question_count": 2}
    )
    assert adapt_resp.status_code == 201
    assert "quiz_id" in adapt_resp.json()
