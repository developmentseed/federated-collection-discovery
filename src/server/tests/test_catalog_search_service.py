from datetime import datetime

from app.catalog_search import STACAPICollectionSearch
from app.catalog_search_service import CatalogSearchService


def test_search_all(mock_apis):
    service = CatalogSearchService(
        catalogs=[
            STACAPICollectionSearch(base_url=mock_api_url) for mock_api_url in mock_apis
        ]
    )

    actual_metadata = service.search_all()

    assert len(actual_metadata) == 4  # all of the mocked collections in conftest.py


def test_search_bbox(mock_apis):
    service = CatalogSearchService(
        catalogs=[
            STACAPICollectionSearch(base_url=mock_api_url, bbox=(-100, 10, -90, 20))
            for mock_api_url in mock_apis
        ]
    )

    actual_metadata = service.search_all()

    assert (
        len(actual_metadata) == 3
    )  # all but one of the mocked collections in conftest.py


def test_search_datetime(mock_apis):
    service = CatalogSearchService(
        catalogs=[
            STACAPICollectionSearch(
                base_url=mock_api_url,
                datetime=(
                    datetime(year=2020, month=1, day=1),
                    datetime(year=2020, month=2, day=1),
                ),
            )
            for mock_api_url in mock_apis
        ]
    )

    actual_metadata = service.search_all()

    assert (
        len(actual_metadata) == 2
    )  # all but one of the mocked collections in conftest.py


def test_search_all_no_collections(mock_apis):
    service = CatalogSearchService(
        catalogs=[STACAPICollectionSearch(base_url=mock_apis[-1])]
    )

    expected_metadata = []
    actual_metadata = service.search_all()

    assert actual_metadata == expected_metadata
