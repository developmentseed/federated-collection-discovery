from datetime import datetime

import pytest
from cmr import CMR_OPS

from federated_collection_discovery.cmr_collection_search import CMRCollectionSearch
from federated_collection_discovery.collection_search import search_all
from federated_collection_discovery.models import CollectionMetadata
from federated_collection_discovery.stac_api_collection_search import (
    STACAPICollectionSearch,
)


@pytest.mark.asyncio
async def test_search_all(executor, mock_apis):
    actual_metadata = await search_all(
        executor,
        catalogs=[
            STACAPICollectionSearch(base_url=mock_api_url) for mock_api_url in mock_apis
        ],
    )

    assert (
        len(list(actual_metadata)) == 5
    )  # all of the mocked collections in conftest.py


@pytest.mark.asyncio
async def test_search_bbox(executor, mock_apis):
    actual_metadata = await search_all(
        executor,
        catalogs=[
            STACAPICollectionSearch(base_url=mock_api_url, bbox=(-100, 10, -90, 20))
            for mock_api_url in mock_apis
        ],
    )

    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        assert (
            len(list(actual_metadata)) == 4
        )  # all but one of the mocked collections in conftest.py


@pytest.mark.asyncio
async def test_search_datetime(executor, mock_apis):
    actual_metadata = await search_all(
        executor,
        catalogs=[
            STACAPICollectionSearch(
                base_url=mock_api_url,
                bbox=(-100, 10, -90, 20),
                datetime=(
                    datetime(year=2020, month=1, day=1),
                    datetime(year=2020, month=2, day=1),
                ),
            )
            for mock_api_url in mock_apis
        ],
    )

    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        assert (
            len(list(actual_metadata)) == 3
        )  # all but one of the mocked collections in conftest.py


@pytest.mark.asyncio
async def test_search_all_no_collections(executor, mock_apis):
    actual_metadata = await search_all(
        executor, catalogs=[STACAPICollectionSearch(base_url=mock_apis[-2])]
    )

    expected_metadata = []

    assert list(actual_metadata) == expected_metadata


@pytest.mark.asyncio
@pytest.mark.vcr
async def test_stac_api_and_cmr(executor, mock_apis):
    # test a search that should only yield results from CMR
    text = "hls"
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        actual_metadata = list(
            await search_all(
                executor,
                catalogs=[
                    STACAPICollectionSearch(
                        base_url=mock_api_url,
                        q=text,
                    )
                    for mock_api_url in mock_apis
                ]
                + [
                    CMRCollectionSearch(
                        base_url=CMR_OPS,
                        q=text,
                    )
                ],
            )
        )

    assert len(actual_metadata) > 1
    for result in actual_metadata:
        if isinstance(result, CollectionMetadata):
            assert result.catalog_url == CMR_OPS

    # test a search that should only yield results from the STAC APIs
    text = "awesome"
    with pytest.warns(UserWarning, match="does not conform to COLLECTION_SEARCH"):
        actual_metadata = list(
            await search_all(
                executor,
                catalogs=[
                    STACAPICollectionSearch(
                        base_url=mock_api_url,
                        q=text,
                    )
                    for mock_api_url in mock_apis
                ]
                + [
                    CMRCollectionSearch(
                        base_url=CMR_OPS,
                        q=text,
                    )
                ],
            )
        )

    assert len(actual_metadata) > 1
    for result in actual_metadata:
        assert result.catalog_url in mock_apis
