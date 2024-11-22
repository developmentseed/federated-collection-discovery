from datetime import datetime

import black
import pytest

from federated_collection_discovery.hint import Packages
from federated_collection_discovery.models import (
    CollectionMetadata,
    FederatedSearchError,
)
from federated_collection_discovery.stac_api_collection_search import (
    STACAPICollectionSearch,
)


def test_base(mock_apis):
    # gather all collections
    base_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
    )

    assert len(list(base_search.get_collection_metadata())) == 2


def test_bbox(mock_apis):
    # filter by bbox

    # the first STAC has two collections that cover the whole globe
    bbox_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
        bbox=(-115, 45, -114, 46),
    )

    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        assert len(list(bbox_search.get_collection_metadata())) == 2

    # the second STAC has one collection with a limited bbox
    bbox_search = STACAPICollectionSearch(
        base_url=mock_apis[1],
        bbox=(-130, 45, -125, 46),
    )

    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        assert len(list(bbox_search.get_collection_metadata())) == 1


def test_datetime(mock_apis):
    # filter by datetime
    datetime_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
        datetime=(
            datetime(year=2020, month=1, day=1, hour=12),
            datetime(year=2020, month=1, day=2, hour=12),
        ),
    )
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        assert len(list(datetime_search.get_collection_metadata())) == 1


def test_text(mock_apis):
    # filter by free-text search
    text_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
        q="another",
    )
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        assert len(list(text_search.get_collection_metadata())) == 1


def test_hint(mock_apis):
    # gather all collections
    base_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
    )
    results = list(base_search.get_collection_metadata())
    assert len(results) == 2

    expected_hint = black.format_str(
        (
            "# set up an item search with pystac_client\n"
            "import pystac_client\n\n"
            'catalog = pystac_client.Client.open("https://stac1.net")\n\n'
            "# get a sample of 10 items\n"
            'search = catalog.search(collections="collection-1", max_items=10,)\n'
            "items = search.items()\n\n"
            "# consider using the bbox and/or datetime filters for a "
            "more targeted search"
        ),
        mode=black.FileMode(),
    )
    for i, result in enumerate(results):
        assert isinstance(result, CollectionMetadata)
        assert result.hint
        if i == 0:
            assert result.hint[Packages.PYSTAC_CLIENT].strip() == expected_hint.strip()


def test_api_error():
    # a search against an API that doesn't exist
    base_search = STACAPICollectionSearch(
        base_url="http://nope",
    )

    assert all(
        isinstance(result, FederatedSearchError)
        for result in base_search.get_collection_metadata()
    )
