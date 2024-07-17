from datetime import datetime, timezone
from typing import List, Optional, Tuple

from pystac_client.client import Client

from app.catalog_collection_search import CatalogCollectionSearch
from app.hint import PYTHON, generate_pystac_client_hint
from app.models import CollectionMetadata
from app.shared import BBox, DatetimeInterval


def get_full_bounding_box(bboxes: Sequence[BBox]) -> BBox:
    """
    Get the full bounding box that encompasses all the bounding boxes
    provided.

    Parameters:
    bboxes (sequence of tuples): Sequence of bounding boxes, where each bounding
        box is represented as a tuple of (xmin, ymin, xmax, ymax).

    Returns:
    full_bbox: BBox containing coordinates representing the full bounding box.
    """
    xmins, ymins, xmaxs, ymaxs = zip(*bboxes)

    return min(xmins), min(ymins), max(xmaxs), max(ymaxs)


def check_bbox_overlap(bbox1: BBox, bbox2: BBox) -> bool:
    xmin1, ymin1, xmax1, ymax1 = bbox1
    xmin2, ymin2, xmax2, ymax2 = bbox2

    return xmin1 <= xmax2 and xmin2 <= xmax1 and ymin1 <= ymax2 and ymin2 <= ymax1


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
    start1, end1 = map(ensure_utc, interval1)
    start2, end2 = map(ensure_utc, interval2)
    dtmin = datetime.min.replace(tzinfo=timezone.utc)
    dtmax = datetime.max.replace(tzinfo=timezone.utc)

    return (start2 or dtmin) <= (end1 or dtmax) and (start1 or dtmin) <= (end2 or dtmax)


def check_text_overlap(
    text: str,
    text_fields: List[str],
) -> bool:
    return any(text.lower() in x.lower() for x in text_fields)


class STACAPICollectionSearch(CatalogCollectionSearch):
    def get_collection_metadata(self) -> Iterable[CollectionMetadata]:
        catalog = Client.open(self.base_url)

        # add /collections conformance class just in case it's missing...
        # https://github.com/stac-utils/pystac-client/issues/320
        # cmr-stac is still missing this conformance class
        # https://github.com/nasa/cmr-stac/issues/236
        # this makes it possible to iterate through all collections
        catalog.add_conforms_to("COLLECTIONS")

        return (
            self.collection_metadata(collection)
            for collection in catalog.get_collections()
            if self.overlaps(collection)
        )

    def overlaps(self, collection: Collection) -> bool:
        return (
            self.spatially_overlaps(collection)
            and self.temporally_overlaps(collection)
            and self.textually_overlaps(collection)
        )

    def spatially_overlaps(self, collection: Collection) -> bool:
        return self.bbox is None or check_bbox_overlap(
            self.bbox,
            get_full_bounding_box(collection.extent.spatial.bboxes),  # type: ignore
        )

    def temporally_overlaps(self, collection: Collection) -> bool:
        start, end = collection.extent.temporal.intervals[0]

        return self.datetime is None or check_datetime_overlap(
            self.datetime, (ensure_utc(start), ensure_utc(end))
        )

    def textually_overlaps(self, collection: Collection) -> bool:
        text_fields: set[str] = {
            text
            for text in [
                collection.id,
                collection.title,
                collection.description,
                *(collection.keywords or []),
            ]
            if text
        }

        return not self.text or check_text_overlap(self.text, text_fields)

    def collection_metadata(self, collection: Collection) -> CollectionMetadata:
        hint = (
            generate_pystac_client_hint(
                base_url=self.base_url,
                collection_id=collection.id,
                bbox=self.bbox,
                datetime_interval=self.datetime,
            )
            if self.hint_lang == PYTHON
            else None
        )

        extent_dict = collection.extent.to_dict()

        return CollectionMetadata(
            catalog_url=self.base_url,
            id=collection.id,
            title=collection.title or "no title",
            spatial_extent=extent_dict["spatial"]["bbox"],
            temporal_extent=extent_dict["temporal"]["interval"],
            description=collection.description,
            keywords=collection.keywords or [],
            hint=hint,
        )
