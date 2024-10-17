import pytest
from asgi_lifespan import LifespanManager
from fastapi.testclient import TestClient
from httpx import (
    ASGITransport,
    AsyncClient,
)

from federated_collection_discovery.main import app, get_settings
from federated_collection_discovery.models import Settings


@pytest.fixture
async def client(mock_apis):
    # Override the default settings with our mocked API endpoints
    def get_settings_override():
        return Settings(
            stac_api_urls=",".join(mock_apis),
        )

    app.dependency_overrides[get_settings] = get_settings_override

    # Manually start and stop the FastAPI lifespan
    async with LifespanManager(app):
        transport = ASGITransport(app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as ac:
            yield ac


@pytest.mark.anyio
async def test_search_no_params(mock_apis, client):
    response = await client.get("/search")
    assert response.status_code == 200
    json_response = response.json()
    assert "results" in json_response


@pytest.mark.anyio
async def test_search_with_bbox(mock_apis, client):
    bbox = "-130,45,-125,46"
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        response = await client.get("/search", params={"bbox": bbox})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 3


@pytest.mark.anyio
async def test_search_with_datetime(mock_apis, client):
    datetime = "2024-01-01T00:00:00Z/.."
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        response = await client.get("/search", params={"datetime": datetime})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 3

    datetime = "2020-01-01T00:00:00Z/2020-01-02T00:00:00Z"
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        response = await client.get("/search", params={"datetime": datetime})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 2


@pytest.mark.anyio
async def test_search_with_q(mock_apis, client):
    q = "awesome"
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        response = await client.get("/search", params={"q": q})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 2

    q = "appropriate"
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        response = await client.get("/search", params={"q": q})
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 2


@pytest.mark.anyio
async def test_search_with_all_params(mock_apis, client):
    bbox = "10,10,20,20"
    datetime = "2020-01-01T00:00:00Z/2020-01-31T23:59:59Z"
    q = "awesome"
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        response = await client.get(
            "/search", params={"bbox": bbox, "datetime": datetime, "q": q}
        )
    assert response.status_code == 200
    json_response = response.json()
    assert len(json_response["results"]) == 1


@pytest.mark.anyio
async def test_search_invalid_bbox(mock_apis, client):
    # Invalid because it doesn't contain 4 values
    bbox_errors = [
        "-130,45,-125",
        "45,-125,46",
        "-130,45,-125,invalid",
        "-130,45,-125,46,59",
    ]

    for bbox in bbox_errors:
        response = await client.get("/search", params={"bbox": bbox})
        assert response.status_code == 400
        assert response.json()["detail"] == f"This is an invalid bbox: {bbox}"


@pytest.mark.anyio
async def test_search_invalid_datetime(mock_apis, client):
    # Invalid datetime strings
    bad_datetimes = [
        "2024-01-01T00:00:00Z/tooSoon",  # Invalid "tooSoon" token
        "20230101/20230102",  # Date without dashes and T tokens
        "2021-30-30T00:00:00Z/2021-31-31T00:00:00Z",  # Invalid day/month values
        "notADate/2023-01-01T00:00:00Z",
        "2024-07-12T14:38:00Z",  # a single datetime
    ]

    for bad_datetime in bad_datetimes:
        response = await client.get("/search", params={"datetime": bad_datetime})
        assert response.status_code == 400
        # The actual message depends on str_to_interval implementation;
        # adapted as "Invalid datetime" for demo purposes here.
        assert "detail" in response.json()


@pytest.mark.anyio
async def test_search_bad_limit(mock_apis, client):
    response = await client.get("/search", params={"limit": -1})
    assert response.status_code == 422


def test_health(mock_apis):
    bad_stac_api_url = "http://fake-stac.net"
    bad_cmr_url = "http://fake-cmr.gov/"
    app.dependency_overrides[get_settings] = lambda: Settings(
        stac_api_urls=",".join(
            [
                mock_apis[0],
                bad_stac_api_url,
            ]
        ),
        cmr_urls=bad_cmr_url,
    )

    with TestClient(app) as client:
        status_response = client.get("/health").json()

    assert status_response[bad_stac_api_url] == "cannot be opened by pystac_client"
    assert status_response[bad_cmr_url] == "cannot be opened by Python CMR client"

    # Clean up overrides after test
    app.dependency_overrides = {}
