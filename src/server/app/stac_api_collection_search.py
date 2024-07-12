from datetime import datetime, timezone
from typing import List, Optional, Tuple

from pystac_client.client import Client

from app.catalog_collection_search import CatalogCollectionSearch
from app.hint import PYTHON, generate_pystac_client_hint
from app.models import CollectionMetadata
from app.shared import DatetimeInterval


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


class STACAPICollectionSearch(CatalogCollectionSearch):
    def get_collection_metadata(self) -> List[CollectionMetadata]:
        self.catalog = Client.open(self.base_url)

        # add /collections conformance class just in case it's missing...
        # https://github.com/stac-utils/pystac-client/issues/320
        # cmr-stac is still missing this conformance class
        # https://github.com/nasa/cmr-stac/issues/236
        # this makes it possible to iterate through all collections
        self.catalog.add_conforms_to("COLLECTIONS")
        results: List[CollectionMetadata] = []
        all_collections = self.catalog.get_collections()
        while len(results) < self.limit:
            try:
                collection = next(all_collections)
            except StopIteration:
                break

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
                    hint = generate_pystac_client_hint(
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
