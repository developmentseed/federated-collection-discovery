import json
from dataclasses import dataclass
from typing import Iterable, List, TypedDict, Union

from cmr import CollectionQuery
from requests.exceptions import RequestException

from federated_collection_discovery.collection_search import CollectionSearch
from federated_collection_discovery.hint import PYTHON, generate_cmr_hint
from federated_collection_discovery.models import (
    CollectionMetadata,
    FederatedSearchError,
)


class CMRCollectionResult(TypedDict, total=False):
    boxes: List[str]
    short_name: str
    id: str
    title: str
    time_start: str
    time_end: str
    summary: str


@dataclass
class CMRCollectionSearch(CollectionSearch):
    def check_health(self) -> str:
        try:
            collection_search = CollectionQuery(mode=self.base_url)
            return "healthy" if collection_search.hits() else "no collections"
        except RequestException:
            return "cannot be opened by Python CMR client"

    def get_collection_metadata(
        self,
    ) -> Iterable[Union[CollectionMetadata, FederatedSearchError]]:
        try:
            collection_search = CollectionQuery(mode=self.base_url)
            if self.bbox:
                collection_search = collection_search.bounding_box(*self.bbox)

            if self.datetime:
                collection_search = collection_search.temporal(*self.datetime)

            if self.q:
                collection_search = collection_search.keyword(self.q)

            return (
                self.collection_metadata(collection)
                for collection in collection_search.get()
            )
        except RequestException as e:
            return [
                FederatedSearchError(catalog_url=self.base_url, error_message=str(e))
            ]

    def collection_metadata(
        self, collection: CMRCollectionResult
    ) -> CollectionMetadata:
        # parse the output of the CMR search
        boxes = collection.get("boxes")
        bbox = tuple(boxes[0].split(" ")) if boxes else None

        short_name = collection.get("short_name")
        if not short_name:
            raise ValueError(
                "This CMR collection does not have a short name:\n "
                f"{json.dumps(collection, indent=2)}"
            )

        collection_id = collection.get("id")
        if not collection_id:
            raise ValueError(
                "This CMR collection does not have an id:\n "
                f"{json.dumps(collection, indent=2)}"
            )

        title = collection.get("title")
        if not title:
            raise ValueError(
                "This CMR collection does not have a title:\n "
                f"{json.dumps(collection, indent=2)}"
            )

        hint = (
            generate_cmr_hint(
                base_url=self.base_url,
                short_name=short_name,
                bbox=self.bbox,
                datetime_interval=self.datetime,
            )
            if self.hint_lang == PYTHON
            else None
        )

        return CollectionMetadata(
            catalog_url=self.base_url,
            id=collection_id,
            title=title,
            spatial_extent=[bbox],
            temporal_extent=[
                [collection.get("time_start"), collection.get("time_end")]
            ],
            description=collection.get("summary"),
            keywords=None,
            hint=hint,
        )
