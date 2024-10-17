import pytest
from cmr.queries import CMR_OPS

from federated_collection_discovery.cmr_collection_search import CMRCollectionSearch
from federated_collection_discovery.models import CollectionMetadata


@pytest.mark.vcr
def test_base():
    # gather all collections
    base_search = CMRCollectionSearch(base_url=CMR_OPS, q="HLS")

    assert any(
        isinstance(x, CollectionMetadata) for x in base_search.get_collection_metadata()
    )
