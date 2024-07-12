from typing import List, Union

from app.cmr_collection_search import CMRCollectionSearch
from app.models import CollectionMetadata
from app.stac_api_collection_search import STACAPICollectionSearch


class CatalogSearchService:
    def __init__(
        self, catalogs: List[Union[CMRCollectionSearch, STACAPICollectionSearch]]
    ):
        self.catalogs = catalogs

    def search_all(self) -> List[CollectionMetadata]:
        results = []
        for catalog in self.catalogs:
            results.extend(catalog.get_collection_metadata())

        return results
