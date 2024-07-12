from datetime import datetime
from typing import Annotated, List, Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import PositiveInt
from stac_fastapi.types.rfc3339 import str_to_interval
from stac_pydantic.shared import BBox

from app.catalog_collection_search import CatalogCollectionSearch, DatetimeInterval
from app.catalog_search_service import CatalogSearchService
from app.cmr_collection_search import CMRCollectionSearch
from app.config import Settings
from app.models import SearchResponse
from app.stac_api_collection_search import STACAPICollectionSearch

invalid_bbox = HTTPException(status_code=400, detail="Invalid bbox")


def str_to_bbox(bbox_str: Optional[str]) -> Optional[BBox]:
    """Convert string to BBox based on , delimiter."""
    if not bbox_str:
        return None

    try:
        t = tuple(float(v) for v in bbox_str.split(","))
    except ValueError:
        raise invalid_bbox
    if not len(t) == 4:
        raise invalid_bbox

    return t


def is_datetime_interval(obj) -> bool:
    # Step 1: Check if obj is a tuple
    if not isinstance(obj, tuple):
        return False

    # Step 2: Check if tuple has exactly two elements
    if len(obj) != 2:
        return False

    # Step 3: Check if each element is either a datetime or None
    for element in obj:
        if not (element is None or isinstance(element, datetime)):
            return False

    # If all checks pass, return True
    return True


def _str_to_interval(datetime_str: Optional[str]) -> Optional[DatetimeInterval]:
    if not datetime_str:
        return None

    datetime_interval: DatetimeInterval = str_to_interval(datetime_str)  # type: ignore

    if not is_datetime_interval(datetime_interval):
        raise HTTPException(
            status_code=400,
            detail="You must provide a datetime range e.g. 2021-02-01T00:00:00Z/.. "
            "or 2024-06-01T00:00:00/2024-06-30T23:59:59Z",
        )

    return datetime_interval


app = FastAPI(
    title="Cross-catalog search API",
    description="API for searching through multiple geospatial data catalogs. "
    "Provides capabilities to filter collections based on bounding "
    "box, datetime intervals, and keywords.",
    version="0.1.0",
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)


@app.get(
    "/search",
    response_model=SearchResponse,
)
def search_collections(
    bbox: Annotated[
        Optional[str],
        Query(description="bounding box coordinates (xmin, xmax, ymin, ymax)"),
    ] = None,
    datetime: Annotated[
        Optional[str],
        Query(
            description="datetime interval, e.g. 2021-02-01T00:00:00Z/.. "
            "or 2024-06-01T00:00:00/2024-06-30T23:59:59Z",
        ),
    ] = None,
    text: Annotated[
        Optional[str],
        Query(
            description=(
                "string to search for in collection IDs, titles, "
                "descriptions, and keywords"
            ),
        ),
    ] = None,
    hint_lang: Annotated[
        Optional[Literal["python"]],
        Query(description="Language for code hint, either python or ..."),
    ] = None,
    limit: Annotated[
        PositiveInt,
        Query(description=("limit for number of returned collection records")),
    ] = 100,
):
    settings = Settings()

    catalogs: List[CatalogCollectionSearch] = []

    search_args = {
        "bbox": str_to_bbox(bbox),
        "datetime": _str_to_interval(datetime),
        "text": text,
        "limit": limit,
        "hint_lang": hint_lang,
    }

    if settings.stac_api_urls:
        catalogs.extend(
            [
                STACAPICollectionSearch(
                    base_url=str(base_url),
                    **search_args,
                )
                for base_url in settings.stac_api_urls
            ]
        )

    if settings.cmr_urls:
        catalogs.extend(
            [
                CMRCollectionSearch(base_url=str(base_url), **search_args)
                for base_url in settings.cmr_urls
            ]
        )

    catalog_service = CatalogSearchService(catalogs=catalogs)

    results = catalog_service.search_all()

    return {"results": results}
