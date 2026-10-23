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

    # 5. Retrieve attempt result via both endpoint paths
    # 5a. Dedicated /attempts/{attempt_id}/result (reported bug fix)
    get_res = await client.get(f"/api/v1/attempts/{attempt_id}/result", headers=headers)
    assert get_res.status_code == 200
    retrieved_card = get_res.json()
    assert retrieved_card["attempt_id"] == attempt_id
    assert retrieved_card["quiz_id"] == quiz_id
    assert retrieved_card["total_score"] == res_card["total_score"]
    assert retrieved_card["percentage"] == res_card["percentage"]
    assert retrieved_card["is_passed"] == res_card["is_passed"]
    assert len(retrieved_card["question_reviews"]) == 2

    # 5b. Root path alias /attempts/{attempt_id}
    alias_res = await client.get(f"/api/v1/attempts/{attempt_id}", headers=headers)
    assert alias_res.status_code == 200
    assert alias_res.json()["attempt_id"] == attempt_id

    # 5c. Valid quiz_id query parameter
    quiz_val_res = await client.get(f"/api/v1/attempts/{attempt_id}/result?quiz_id={quiz_id}", headers=headers)
    assert quiz_val_res.status_code == 200

    # 5d. Mismatched quiz_id query parameter returns 404
    mismatch_res = await client.get(f"/api/v1/attempts/{attempt_id}/result?quiz_id=00000000-0000-0000-0000-000000000000", headers=headers)
    assert mismatch_res.status_code == 404

    # 6. Check analytics summary
    analytics_resp = await client.get("/api/v1/analytics/summary", headers=headers)
    assert analytics_resp.status_code == 200
    analytics_data = analytics_resp.json()
    assert analytics_data["total_quizzes_taken"] >= 1
    assert "Mathematics" in analytics_data["mastery_by_subject"]

    # 7. Generate adaptive remediation quiz
    adapt_resp = await client.post(
        "/api/v1/analytics/adaptive-quiz",
        headers=headers,
        json={"subject": "Mathematics", "question_count": 2}
    )
    assert adapt_resp.status_code == 201
    assert "quiz_id" in adapt_resp.json()


@pytest.mark.asyncio
async def test_attempt_lifecycle_and_security_isolation(client: AsyncClient, registered_user: dict, db_session):
    """
    Verifies that:
    1. In-progress attempts cannot be prematurely retrieved to leak answer keys.
    2. Nonexistent attempts return 404.
    3. Another student cannot retrieve or submit a private attempt belonging to someone else.
    4. Repeated submissions are idempotent and do not create duplicate answer records.
    """
    headers = registered_user["headers"]

    # Create a quiz directly via API or services
    doc_content = "World History: Ancient Rome and the Republic."
    files = {"file": ("history.txt", doc_content.encode("utf-8"), "text/plain")}
    doc_resp = await client.post("/api/v1/documents/upload", headers=headers, files=files, data={"title": "Ancient Rome"})
    assert doc_resp.status_code == 202
    doc_id = doc_resp.json()["document_id"]

    # Wait for document to be ready
    import asyncio
    for _ in range(30):
        st = await client.get(f"/api/v1/documents/{doc_id}/status", headers=headers)
        if st.status_code == 200 and st.json()["status"] == "READY":
            break
        await asyncio.sleep(0.1)

    gen_resp = await client.post(
        "/api/v1/quizzes/generate",
        headers=headers,
        json={
            "document_id": doc_id,
            "title": "Roman History Quiz",
            "subject": "History",
            "difficulty": "easy",
            "question_count": 2,
            "duration_minutes": 15,
            "question_types": ["single_choice", "true_false"]
        }
    )
    assert gen_resp.status_code in [201, 202]
    quiz_id = gen_resp.json()["quiz_id"]

    # Start attempt
    start_resp = await client.post("/api/v1/attempts/start", headers=headers, json={"quiz_id": quiz_id})
    assert start_resp.status_code == 201
    attempt_id = start_resp.json()["attempt_id"]

    # Guard check: Unsubmitted / IN_PROGRESS attempt must return 400 (not leak answer keys)
    early_fetch = await client.get(f"/api/v1/attempts/{attempt_id}/result", headers=headers)
    assert early_fetch.status_code == 400
    assert "still in progress" in early_fetch.json()["detail"].lower()

    # Nonexistent attempt ID returns 404
    non_existent = await client.get("/api/v1/attempts/00000000-0000-0000-0000-000000000000/result", headers=headers)
    assert non_existent.status_code == 404

    # Register student 2
    student2_payload = {
        "email": "student2@example.com",
        "password": "Password123!",
        "full_name": "Second Student",
        "role": "student"
    }
    s2_reg = await client.post("/api/v1/auth/register", json=student2_payload)
    assert s2_reg.status_code == 201
    student2_headers = {"Authorization": f"Bearer {s2_reg.json()['access_token']}"}

    # Student 2 attempts to fetch Student 1's attempt -> must return 404 (not disclose existence)
    unauthorized_fetch = await client.get(f"/api/v1/attempts/{attempt_id}/result", headers=student2_headers)
    assert unauthorized_fetch.status_code == 404

    # Student 2 attempts to submit answers to Student 1's attempt -> must return 404
    unauthorized_submit = await client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        headers=student2_headers,
        json={"answers": []}
    )
    assert unauthorized_submit.status_code == 404

    # Now Student 1 submits valid answers
    quiz_info = (await client.get(f"/api/v1/quizzes/{quiz_id}", headers=headers)).json()
    questions = quiz_info["questions"]
    student1_answers = [
        {"question_id": q["id"], "selected_option_ids": [q["options"][0]["id"]], "text_response": None}
        for q in questions
    ]

    sub_res = await client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        headers=headers,
        json={"answers": student1_answers}
    )
    assert sub_res.status_code == 200
    card1 = sub_res.json()
    assert card1["attempt_id"] == attempt_id

    # Idempotency check: Repeated submission returns same result without creating duplicate records
    sub_res_retry = await client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        headers=headers,
        json={"answers": student1_answers}
    )
    assert sub_res_retry.status_code == 200
    card2 = sub_res_retry.json()
    assert card2["attempt_id"] == attempt_id
    assert card2["total_score"] == card1["total_score"]

    # Verify result retrieval by student 1 succeeds
    final_fetch = await client.get(f"/api/v1/attempts/{attempt_id}/result", headers=headers)
    assert final_fetch.status_code == 200
    final_card = final_fetch.json()
    assert final_card["attempt_id"] == attempt_id
    assert len(final_card["question_reviews"]) == len(questions)

    # Student 2 still cannot access Student 1's completed attempt
    s2_final_try = await client.get(f"/api/v1/attempts/{attempt_id}/result", headers=student2_headers)
    assert s2_final_try.status_code == 404

