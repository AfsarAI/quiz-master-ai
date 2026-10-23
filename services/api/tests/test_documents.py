import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_document_upload_and_pipeline(client: AsyncClient, registered_user: dict):
    headers = registered_user["headers"]

    # Sample educational text content
    content = (
        "Unit 1: Machine Learning Foundations\n\n"
        "Supervised learning algorithms map input data points to target output labels using training datasets.\n\n"
        "Gradient descent is an optimization algorithm that iteratively minimizes the empirical loss function "
        "by updating parameters in the opposite direction of the gradient vector.\n\n"
        "Overfitting occurs when a statistical model memorizes idiosyncratic training noise rather than generalizing "
        "to unobserved validation distributions."
    )

    files = {"file": ("foundations.txt", content.encode("utf-8"), "text/plain")}
    data = {"title": "Machine Learning Foundations"}

    # 1. Upload document
    resp = await client.post("/api/v1/documents/upload", headers=headers, files=files, data=data)
    assert resp.status_code == 202
    res_data = resp.json()
    doc_id = res_data["document_id"]
    assert res_data["status"] == "PROCESSING"

    # 2. Poll status
    status_resp = await client.get(f"/api/v1/documents/{doc_id}/status", headers=headers)
    assert status_resp.status_code == 200
    st_data = status_resp.json()
    assert st_data["document_id"] == doc_id
    assert st_data["title"] == "Machine Learning Foundations"

    # 3. List documents
    list_resp = await client.get("/api/v1/documents/", headers=headers)
    assert list_resp.status_code == 200
    docs = list_resp.json()
    assert len(docs) >= 1
    assert docs[0]["id"] == doc_id
