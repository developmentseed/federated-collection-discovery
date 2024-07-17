from cmr.queries import CMR_OPS

from app.catalog_collection_search import DEFAULT_LIMIT
from app.cmr_collection_search import CMRCollectionSearch


def test_base():
    # gather all collections
    base_search = CMRCollectionSearch(base_url=CMR_OPS)

    assert len(list(base_search.get_collection_metadata())) == DEFAULT_LIMIT


def test_limit():
    # gather all collections
    base_search = CMRCollectionSearch(base_url=CMR_OPS, limit=1)

    assert len(list(base_search.get_collection_metadata())) == 1
