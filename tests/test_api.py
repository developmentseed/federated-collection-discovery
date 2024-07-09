import pytest
from fastapi.testclient import TestClient
from app.main import app  # Modify to import your FastAPI app from the correct module


@pytest.fixture
def client(mock_apis):
    return TestClient(app)


def test_search_no_params(mock_apis, client):
    response = client.get("/search")
    assert response.status_code == 200
    json_response = response.json()
    assert "results" in json_response


def test_search_with_bbox(mock_apis, client):
    bbox = "-130,45,-125,46"
    response = client.get("/search", params={"bbox": bbox})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 3


def test_search_with_datetime(mock_apis, client):
    datetime = "2024-01-01T00:00:00Z/.."
    response = client.get("/search", params={"datetime": datetime})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 3

    datetime = "2020-01-01T00:00:00Z/2020-01-02T00:00:00Z"
    response = client.get("/search", params={"datetime": datetime})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 2


def test_search_with_text(mock_apis, client):
    text = "awesome"
    response = client.get("/search", params={"text": text})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 2

    text = "appropriate"
    response = client.get("/search", params={"text": text})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 2


def test_search_with_all_params(mock_apis, client):
    bbox = "10,10,20,20"
    datetime = "2020-01-01T00:00:00Z/2020-01-31T23:59:59Z"
    text = "awesome"
    response = client.get(
        "/search", params={"bbox": bbox, "datetime": datetime, "text": text}
    )
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 1
