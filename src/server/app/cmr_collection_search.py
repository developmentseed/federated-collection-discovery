from dataclasses import dataclass
from typing import List

from cmr import CollectionQuery

from app.catalog_collection_search import CatalogCollectionSearch
from app.hint import PYTHON, generate_cmr_hint
from app.models import CollectionMetadata


@dataclass
class CMRCollectionSearch(CatalogCollectionSearch):
    def get_collection_metadata(self) -> List[CollectionMetadata]:
        collection_search = CollectionQuery(mode=self.base_url)
        if self.bbox:
            collection_search = collection_search.bounding_box(*self.bbox)

        if self.datetime:
            collection_search = collection_search.temporal(*self.datetime)

        if self.text:
            collection_search = collection_search.keyword(self.text)

        results = []
        for collection in collection_search.get(limit=self.limit):
            boxes = collection.get("boxes")
            bbox = tuple(boxes[0].split(" ")) if boxes else None

            hint = None
            if self.hint_lang == PYTHON:
                hint = generate_cmr_hint(
                    base_url=self.base_url,
                    short_name=collection.get("short_name"),
                    bbox=self.bbox,
                    datetime_interval=self.datetime,
                )

            collection_metadata = CollectionMetadata(
                catalog_url=self.base_url,
                id=collection.get("id"),
                title=collection.get("title"),
                spatial_extent=[bbox],
                temporal_extent=[
                    [collection.get("time_start"), collection.get("time_end")]
                ],
                description=collection.get("summary"),
                keywords=None,
                hint=hint,
            )
            results.append(collection_metadata)

        return results
