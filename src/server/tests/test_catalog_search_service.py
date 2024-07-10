from unittest.mock import Mock

import pytest

from app.catalog_search import CatalogCollectionSearch, STACAPICollectionSearch
from app.catalog_search_service import CatalogSearchService
from app.models import CollectionMetadata


@pytest.fixture
def mock_collections():
    return [
        Mock(id="1", title="Title 1", description="Desc 1", keywords=["tag1"]),
        Mock(id="2", title="Title 2", description="Desc 2", keywords=["tag2"]),
    ]


@pytest.fixture
def mock_catalog_collection_searches(mock_collections):
    mock_search_1 = Mock(spec=CatalogCollectionSearch)
    mock_search_1.get_collections.return_value = mock_collections[:1]
    mock_search_1.base_url = "http://mocksearch1.test"  # Add base_url for assertion

    mock_search_2 = Mock(spec=STACAPICollectionSearch)
    mock_search_2.get_collections.return_value = mock_collections[1:]
    mock_search_2.base_url = "http://mocksearch2.test"  # Add base_url for assertion

    expected_metadata = [
        CollectionMetadata(
            catalog_url=mock_search_1.base_url,
            id=mock_collections[0].id,
            title=mock_collections[0].title,
            description=mock_collections[0].description,
            keywords=mock_collections[0].keywords,
        ),
        CollectionMetadata(
            catalog_url=mock_search_2.base_url,
            id=mock_collections[1].id,
            title=mock_collections[1].title,
            description=mock_collections[1].description,
            keywords=mock_collections[1].keywords,
        ),
    ]

    return mock_search_1, mock_search_2, expected_metadata


def test_search_all(mock_catalog_collection_searches, mock_collections):
    mock_search_1, mock_search_2, expected_metadata = mock_catalog_collection_searches

    service = CatalogSearchService(catalogs=[mock_search_1, mock_search_2])

    actual_metadata = service.search_all()

    assert len(actual_metadata) == len(expected_metadata)
    for i in range(len(expected_metadata)):
        assert actual_metadata[i].catalog_url == expected_metadata[i].catalog_url
        assert actual_metadata[i].id == expected_metadata[i].id
        assert actual_metadata[i].title == expected_metadata[i].title
        assert actual_metadata[i].description == expected_metadata[i].description
        assert actual_metadata[i].keywords == expected_metadata[i].keywords


def test_search_all_no_collections(mock_catalog_collection_searches):
    mock_search_1, mock_search_2, _ = mock_catalog_collection_searches

    mock_search_1.get_collections.return_value = []
    mock_search_2.get_collections.return_value = []

    service = CatalogSearchService(catalogs=[mock_search_1, mock_search_2])

    expected_metadata = []

    actual_metadata = service.search_all()

    assert actual_metadata == expected_metadata


def test_search_all_no_title(mock_catalog_collection_searches, mock_collections):
    mock_search_1, mock_search_2, _ = mock_catalog_collection_searches

    mock_collections[0].title = None  # Simulate collection with no title

    service = CatalogSearchService(catalogs=[mock_search_1, mock_search_2])

    actual_metadata = service.search_all()

    assert actual_metadata[0].title == "no title"  # This tests the no title condition
