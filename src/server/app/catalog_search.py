from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from pystac import Collection
from pystac_client.client import Client
from stac_pydantic.shared import BBox


def check_bbox_overlap(bbox1, bbox2):
    return not (
        bbox2[0] > bbox1[2]
        or bbox2[2] < bbox1[0]
        or bbox2[1] > bbox1[3]
        or bbox2[3] < bbox1[1]
    )


DatetimeInterval = Tuple[Optional[datetime], Optional[datetime]]


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
    collection: Collection,
) -> bool:
    collection_slots = [collection.title, collection.description]
    if collection.keywords:
        collection_slots.extend(collection.keywords)

    return any(text.lower() in x.lower() for x in collection_slots)


class CatalogCollectionSearch(ABC):
    def __init__(
        self,
        base_url: str,
        bbox: Optional[BBox] = None,
        datetime: Optional[DatetimeInterval] = None,
        text: Optional[str] = None,
    ):
        self.base_url = base_url

        # convert the datetime parameter to a tuple of datetime objects
        self._datetime = datetime
        self._bbox = bbox
        self._text = text

    @abstractmethod
    def get_collections(self) -> List[Collection]:
        pass


class STACAPICollectionSearch(CatalogCollectionSearch):
    def get_collections(self) -> List[Collection]:
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
                check_bbox_overlap(self._bbox, collection.extent.spatial.bboxes[0])
                if self._bbox
                else True
            )

            # check temporal overlap
            collection_temporal_extent = tuple(
                collection.extent.temporal.intervals[0][:2]
            )
            assert len(collection_temporal_extent) == 2
            temporal_overlap = (
                check_datetime_overlap(
                    self._datetime,
                    collection_temporal_extent,
                )
                if self._datetime
                else True
            )

            # check text
            text_overlap = (
                check_text_overlap(self._text, collection) if self._text else True
            )

            if bbox_overlap and temporal_overlap and text_overlap:
                results.append(collection)

        return results
