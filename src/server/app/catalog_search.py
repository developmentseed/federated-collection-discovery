from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Literal, Optional, Tuple

import httpx
from pystac_client.client import Client
from stac_pydantic.shared import BBox

from app.hint import generate_python_hint
from app.models import CollectionMetadata
from app.shared import DatetimeInterval

PYTHON = "python"


def check_bbox_overlap(bbox1, bbox2):
    return not (
        bbox2[0] > bbox1[2]  # xmax 1 < xmin 2
        or bbox2[2] < bbox1[0]  # xmin 1 > xmax 2
        or bbox2[1] > bbox1[3]  # ymax 1 < ymin 2
        or bbox2[3] < bbox1[1]  # ymin 1 > ymax 2
    )


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Handle naive datetime, assuming it to be in UTC.
        return dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)


def check_datetime_overlap(
    interval1: DatetimeInterval,
    interval2: DatetimeInterval,
) -> bool:
    start1, end1 = map(ensure_utc, interval1)
    start2, end2 = map(ensure_utc, interval2)

    # Handle None values which denote open intervals
    if start1 is None:
        start1 = datetime.min.replace(tzinfo=timezone.utc)
    if end1 is None:
        end1 = datetime.max.replace(tzinfo=timezone.utc)
    if start2 is None:
        start2 = datetime.min.replace(tzinfo=timezone.utc)
    if end2 is None:
        end2 = datetime.max.replace(tzinfo=timezone.utc)

    return not (start2 > end1 or end2 < start1)


def check_text_overlap(
    text: str,
    text_fields: List[str],
) -> bool:
    return any(text.lower() in x.lower() for x in text_fields)


@dataclass
class CatalogCollectionSearch(ABC):
    base_url: str
    bbox: Optional[BBox] = None
    datetime: Optional[DatetimeInterval] = None
    text: Optional[str] = None
    hint_lang: Optional[Literal["python"]] = None

    @abstractmethod
    def get_collection_metadata(self) -> List[CollectionMetadata]:
        pass


class STACAPICollectionSearch(CatalogCollectionSearch):
    def get_collection_metadata(self) -> List[CollectionMetadata]:
        self.catalog = Client.open(self.base_url)

        # add /collections conformance class just in case it's missing...
        # https://github.com/stac-utils/pystac-client/issues/320
        # cmr-stac is still missing this conformance class
        # https://github.com/nasa/cmr-stac/issues/236
        # this makes it possible to iterate through all collections
        self.catalog.add_conforms_to("COLLECTIONS")
        results = []
        for collection in self.catalog.get_collections():
            # check bbox overlap
            bbox_overlap = (
                check_bbox_overlap(self.bbox, collection.extent.spatial.bboxes[0])
                if self.bbox
                else True
            )

            # check temporal overlap
            collection_temporal_extent: Tuple[
                Optional[datetime], Optional[datetime]
            ] = (
                ensure_utc(collection.extent.temporal.intervals[0][0]),
                ensure_utc(collection.extent.temporal.intervals[0][1]),
            )

            temporal_overlap = (
                check_datetime_overlap(
                    self.datetime,
                    collection_temporal_extent,
                )
                if self.datetime
                else True
            )

            # check text fields for overlap
            text_fields = [collection.id]
            if collection.keywords:
                text_fields.extend(collection.keywords)
            if collection.title:
                text_fields.append(collection.title)
            if collection.description:
                text_fields.append(collection.description)

            text_overlap = (
                check_text_overlap(self.text, text_fields) if self.text else True
            )

            if bbox_overlap and temporal_overlap and text_overlap:
                hint = None
                if self.hint_lang == PYTHON:
                    hint = generate_python_hint(
                        base_url=self.base_url,
                        collection_id=collection.id,
                        bbox=self.bbox,
                        datetime_interval=self.datetime,
                    )
                extent_dict = collection.extent.to_dict()
                collection_metadata = CollectionMetadata(
                    catalog_url=self.base_url,
                    id=collection.id,
                    title=collection.title or "no title",
                    spatial_extent=extent_dict["spatial"]["bbox"],
                    temporal_extent=extent_dict["temporal"]["interval"],
                    description=collection.description,
                    keywords=collection.keywords or [],
                    hint=hint,
                )
                results.append(collection_metadata)

        return results


class CMRCollectionSearch(CatalogCollectionSearch):
    def get_collection_metadata(self) -> List[CollectionMetadata]:
        # query CMR using httpx or requests, format CollectionMetadata
        request_url = self.base_url + "/search/collections.json?"
        query_params = []
        if self.bbox:
            query_params.append(
                f"bounding_box[]={','.join(str(coord) for coord in self.bbox)}"
            )
        if self.datetime:
            datetime_str = ",".join(
                dt.strftime("%Y-%m-%dT%H:%M:%SZ")  # type: ignore
                for dt in self.datetime
            )
            query_params.append(f"temporal\\[\\]={datetime_str}")
        if self.text:
            query_params.append("keyword={text}")

        request_url += "&".join(query_params)

        response_json = httpx.get(request_url).json()

        results = []
        for collection in response_json["feed"]["entry"]:
            boxes = collection.get("boxes")
            bbox = tuple(" ".split(boxes)) if boxes else None
            collection_metadata = CollectionMetadata(
                catalog_url=self.base_url,
                id=collection.get("id"),
                title=collection.get("title"),
                spatial_extent=[bbox],
                temporal_extent=[[None, None]],
                description=collection.get("summary"),
                keywords=None,
                hint=None,
            )
            results.append(collection_metadata)

        return results
