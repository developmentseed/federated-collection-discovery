import pytest
import requests_mock


@pytest.fixture
def mock_apis(monkeypatch):
    with requests_mock.Mocker() as m:
        base_urls = ["https://stac1.net", "https://stac2.net", "https://stac3.net"]
        for i, base_url in enumerate(base_urls):
            collections_url = f"{base_url}/collections"

            if base_url == "https://stac1.net":
                collection_data = [
                    {
                        "stac_version": "1.0.0",
                        "id": "collection-1",
                        "type": "Collection",
                        "description": "A really awesome STAC collection for testing",
                        "license": "proprietary",
                        "extent": {
                            "spatial": {"bbox": [[-180, -90, 180, 90]]},
                            "temporal": {"interval": [["2020-01-01T00:00:00Z", None]]},
                        },
                        "links": [],
                        "item_assets": {},
                        "summaries": {},
                    },
                    {
                        "stac_version": "1.0.0",
                        "id": "collection-2",
                        "type": "Collection",
                        "description": "Another awesome STAC collection for testing",
                        "license": "proprietary",
                        "extent": {
                            "spatial": {"bbox": [[-180, -90, 180, 90]]},
                            "temporal": {"interval": [["2021-01-01T00:00:00Z", None]]},
                        },
                        "links": [],
                        "item_assets": {},
                        "summaries": {},
                    },
                ]
            elif base_url == "https://stac2.net":
                collection_data = [
                    {
                        "stac_version": "1.0.0",
                        "id": "collection-3",
                        "type": "Collection",
                        "description": "An appropriate STAC collection for testing",
                        "license": "proprietary",
                        "extent": {
                            "spatial": {"bbox": [[-180, -90, 180, 90]]},
                            "temporal": {
                                "interval": [
                                    ["2020-01-01T00:00:00Z", "2020-12-31T23:59:59"]
                                ]
                            },
                        },
                        "links": [],
                        "item_assets": {},
                        "summaries": {},
                    },
                    {
                        "stac_version": "1.0.0",
                        "id": "collection-4",
                        "type": "Collection",
                        "description": (
                            "Another appropriate STAC collection for testing"
                        ),
                        "license": "proprietary",
                        "extent": {
                            "spatial": {"bbox": [[-120, 40, -110, 50]]},
                            "temporal": {"interval": [["2024-01-01T00:00:00Z", None]]},
                        },
                        "links": [],
                        "item_assets": {},
                        "summaries": {},
                    },
                ]
            elif base_url == "https://stac3.net":
                collection_data = []
            else:
                raise ValueError(f"No collections defined for base_url {base_url}")

            # Mock the collections endpoint to return the predefined collections data
            m.get(
                collections_url, status_code=200, json={"collections": collection_data}
            )

            # Mock the root catalog response to include a link to the collections
            # endpoint
            catalog_root_response = {
                "type": "Catalog",
                "stac_version": "1.0.0",
                "id": f"root-catalog-{i + 1}",
                "description": f"Root catalog for {base_url}",
                "links": [
                    {"rel": "self", "href": base_url, "type": "application/json"},
                    {"rel": "root", "href": base_url, "type": "application/json"},
                    {"rel": "data", "href": collections_url},
                ],
                "conformsTo": [
                    "https://api.stacspec.org/v1.0.0-beta.1/core",
                    "https://api.stacspec.org/v1.0.0-beta.1/collections",
                    "https://api.stacspec.org/v1.0.0-beta.1/item-search",
                    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
                    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30",
                    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
                ],
            }
            m.get(base_url, status_code=200, json=catalog_root_response)

        monkeypatch.setenv("CROSS_CATALOG_SEARCH_STAC_API_URLS", ",".join(base_urls))

        yield base_urls
