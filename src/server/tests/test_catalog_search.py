# test CMR

# test STAC API with collection-search

# test STAC catalog with nested catalogs

from datetime import datetime

from app.catalog_search import STACAPICollectionSearch


def test_base(mock_apis):
    # gather all collections
    base_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
    )

    assert len(base_search.get_collections()) == 2


def test_bbox(mock_apis):
    # filter by bbox

    # the first STAC has two collections that cover the whole globe
    bbox_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
        bbox=(-115, 45, -114, 46),
    )

    assert len(bbox_search.get_collections()) == 2

    # the second STAC has one collection with a limited bbox
    bbox_search = STACAPICollectionSearch(
        base_url=mock_apis[1],
        bbox=(-130, 45, -125, 46),
    )

    assert len(bbox_search.get_collections()) == 1


def test_datetime(mock_apis):
    # filter by datetime
    datetime_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
        datetime=(
            datetime(year=2020, month=1, day=1, hour=12),
            datetime(year=2020, month=1, day=2, hour=12),
        ),
    )
    assert len(datetime_search.get_collections()) == 1


def test_text(mock_apis):
    # filter by free-text search
    text_search = STACAPICollectionSearch(
        base_url=mock_apis[0],
        text="another",
    )
    assert len(text_search.get_collections()) == 1
