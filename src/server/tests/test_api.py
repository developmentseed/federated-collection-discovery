import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app, get_settings


@pytest.fixture
def client(mock_apis):
    # override the default settings with our mocked api endpoints
    def get_settings_override():
        return Settings(stac_api_urls=",".join(mock_apis))

    app.dependency_overrides[get_settings] = get_settings_override

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


def test_search_invalid_bbox(mock_apis, client):
    # Invalid because it doesn't contain 4 values
    bbox_errors = [
        "-130,45,-125",
        "45,-125,46",
        "-130,45,-125,invalid",
        "-130,45,-125,46,59",
    ]

    for bbox in bbox_errors:
        response = client.get("/search", params={"bbox": bbox})
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid bbox"


def test_search_invalid_datetime(mock_apis, client):
    # Invalid datetime strings
    bad_datetimes = [
        "2024-01-01T00:00:00Z/tooSoon",  # Invalid "tooSoon" token
        "20230101/20230102",  # Date without dashes and T tokens
        "2021-30-30T00:00:00Z/2021-31-31T00:00:00Z",  # Invalid day/month values
        "notADate/2023-01-01T00:00:00Z",
        "2024-07-12T14:38:00Z",  # a single datetime
    ]

    for bad_datetime in bad_datetimes:
        response = client.get("/search", params={"datetime": bad_datetime})
        assert response.status_code == 400
        # The actual message depends on str_to_interval implementation;
        # adapted as "Invalid datetime" for demo purposes here.
        assert "detail" in response.json()


def test_search_bad_limit(mock_apis, client):
    response = client.get("/search", params={"limit": -1})
    assert response.status_code == 422
