from datetime import datetime
from functools import lru_cache
from typing import Annotated, List, Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import PositiveInt
from stac_fastapi.types.rfc3339 import str_to_interval
from stac_pydantic.shared import BBox

from app.catalog_collection_search import (
    CatalogCollectionSearch,
    DatetimeInterval,
    search_all,
)
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
        x0, y0, x1, y1 = map(float, bbox_str.split(","))
    except ValueError:
        raise invalid_bbox from None

    return x0, y0, x1, y1


def is_datetime_interval(obj) -> bool:
    return (
        isinstance(obj, tuple)
        and len(obj) == 2
        and all(isinstance(elem, datetime) or elem is None for elem in obj)
    )


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


@lru_cache
def get_settings() -> Settings:
    return Settings()


@app.get(
    "/search",
    response_model=SearchResponse,
)
def search_collections(
    settings: Annotated[Settings, Depends(get_settings)],
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

    results = search_all(catalogs)

    return {"results": results}
