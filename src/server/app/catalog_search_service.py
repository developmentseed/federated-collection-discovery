from typing import List

from app.catalog_search import CatalogCollectionSearch
from app.models import CollectionMetadata


class CatalogSearchService:
    def __init__(self, catalogs: List[CatalogCollectionSearch]):
        self.catalogs = catalogs

    def search_all(self) -> List[CollectionMetadata]:
        results = []
        for catalog in self.catalogs:
            results.extend(catalog.get_collection_metadata())

        return results
