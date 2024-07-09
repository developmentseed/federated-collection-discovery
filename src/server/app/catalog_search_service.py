from typing import List

from app.catalog_search import CatalogCollectionSearch
from app.models import CollectionMetadata


class CatalogSearchService:
    def __init__(self, catalogs: List[CatalogCollectionSearch]):
        self.catalogs = catalogs

    def search_all(self) -> List[CollectionMetadata]:
        results = []
        for catalog in self.catalogs:
            collections = catalog.get_collections()
            for collection in collections:
                results.append(
                    CollectionMetadata(
                        catalog_url=catalog.base_url,
                        id=collection.id,
                        title=collection.title or "no title",
                        description=collection.description,
                        keywords=collection.keywords or [],
                    )
                )
        return results
