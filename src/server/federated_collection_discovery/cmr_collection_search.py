import json
from copy import copy
from dataclasses import dataclass
from typing import Iterable, List, TypedDict, Union

from cmr import CMR_OPS, CollectionQuery
from requests.exceptions import RequestException

from federated_collection_discovery.collection_search import CollectionSearch
from federated_collection_discovery.free_text import parse_query_for_cmr
from federated_collection_discovery.hint import (
    Packages,
    generate_earthaccess_hint,
    generate_pystac_client_hint,
    generate_python_cmr_hint,
    generate_rstac_hint,
)
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
    data_center: str
    version_id: str


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
            collection_searches = []

            collection_search = CollectionQuery(mode=self.base_url)
            if self.bbox:
                collection_search = collection_search.bounding_box(*self.bbox)

            if self.datetime:
                collection_search = collection_search.temporal(*self.datetime)

            if self.q:
                # parse the q parameter so we can send OR queries as separate requests
                q_parsed = parse_query_for_cmr(self.q)
                # if it requires multiple separate queries identify them and add them
                # to the list
                for _q in q_parsed:
                    _collection_search = copy(collection_search)

                    collection_searches.append(_collection_search.keyword(_q))
            else:
                collection_searches.append(collection_search)

            yield from (
                self.collection_metadata(collection)
                for collection_search in collection_searches
                for collection in collection_search.get()
            )
        except Exception as e:
            yield FederatedSearchError(catalog_url=self.base_url, error_message=str(e))

    def collection_metadata(
        self, collection: CMRCollectionResult
    ) -> CollectionMetadata:
        # parse the output of the CMR search
        boxes = collection.get("boxes")
        spatial_extent = []
        if boxes:
            for box in boxes:
                print("box", box)
                bbox_split = [float(i) for i in box.split(" ")]
                spatial_extent.append(
                    (bbox_split[1], bbox_split[0], bbox_split[3], bbox_split[2])
                )
        elif polygons := collection.get("polygons", None):
            assert isinstance(polygons, list)
            for polygon in polygons:
                lats = []
                lons = []
                for i, coord in enumerate(
                    float(coord) for coord in polygon[0].split(" ")
                ):
                    # coords are space-separated lat lon pairs so even indices are lats
                    if i % 2:
                        lons.append(coord)
                    else:
                        lats.append(coord)

                spatial_extent.append((min(lons), min(lats), max(lons), max(lats)))

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

        data_center = collection.get("data_center")
        if not data_center:
            raise ValueError(
                "This CMR collection does not have a data_center:\n "
                f"{json.dumps(collection, indent=2)}"
            )

        version = collection.get("version_id")

        cmr_stac_url = self.base_url.replace("/search/", "/stac/") + data_center
        cmr_stac_collection_id = short_name
        if version and version.lower() != "not provided":
            cmr_stac_collection_id += f"_{version}"

        hint = {
            Packages.PYSTAC_CLIENT: generate_pystac_client_hint(
                base_url=cmr_stac_url,
                collection_id=cmr_stac_collection_id,
                bbox=self.bbox,
                datetime_interval=self.datetime,
            ),
            Packages.PYTHON_CMR: generate_python_cmr_hint(
                base_url=self.base_url,
                short_name=short_name,
                bbox=self.bbox,
                datetime_interval=self.datetime,
            ),
            Packages.RSTAC: generate_rstac_hint(
                base_url=cmr_stac_url,
                collection_id=cmr_stac_collection_id,
                bbox=self.bbox,
                datetime_interval=self.datetime,
            ),
        }

        # only provide earthaccess hint if base_url is the normal CMR url
        if self.base_url == CMR_OPS:
            hint[Packages.EARTHACCESS] = generate_earthaccess_hint(
                short_name=short_name,
                bbox=self.bbox,
                datetime_interval=self.datetime,
            )

        return CollectionMetadata(
            catalog_url=self.base_url,
            id=collection_id,
            title=title,
            spatial_extent=spatial_extent,
            temporal_extent=[
                [collection.get("time_start"), collection.get("time_end")]
            ],
            description=collection.get("summary"),
            keywords=None,
            hint=hint,
        )
