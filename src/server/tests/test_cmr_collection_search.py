from cmr.queries import CMR_OPS

from federated_collection_discovery.cmr_collection_search import CMRCollectionSearch


def test_base():
    # gather all collections
    base_search = CMRCollectionSearch(base_url=CMR_OPS)

    assert any(True for _ in base_search.get_collection_metadata())
