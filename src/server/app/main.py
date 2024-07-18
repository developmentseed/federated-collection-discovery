import itertools
from datetime import datetime
from functools import lru_cache
from typing import Annotated, Any, List, Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import PositiveInt
from stac_fastapi.types.rfc3339 import str_to_interval

from app.cmr_collection_search import CMRCollectionSearch
from app.collection_search import (
    CollectionSearch,
    DatetimeInterval,
    search_all,
)
from app.config import Settings
from app.models import SearchResponse
from app.shared import BBox
from app.stac_api_collection_search import STACAPICollectionSearch

DEFAULT_LIMIT = 100


def str_to_bbox(bbox_str: Optional[str]) -> Optional[BBox]:
    """Convert string to BBox based on , delimiter."""
    if not bbox_str:
        return None

    try:
        x0, y0, x1, y1 = map(float, bbox_str.split(","))
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"This is an invalid bbox: {bbox_str}"
        ) from None

    return x0, y0, x1, y1


def is_datetime_interval(obj: Any) -> bool:
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
            detail=f"This is an invalid datetime interval: {datetime_str}.\n"
            "You must provide a datetime range e.g. 2021-02-01T00:00:00Z/.. "
            "or 2024-06-01T00:00:00/2024-06-30T23:59:59Z",
        )

    return datetime_interval


@lru_cache
def get_settings() -> Settings:
    return Settings()


app = FastAPI(
    title="Federated Collection Discovery API",
    description="API for discovering collections in a set of APIs. "
    "Provides capabilities to filter collections based on bounding "
    "box, datetime intervals, and keywords.",
    version="0.1.0",
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    ] = DEFAULT_LIMIT,
):
    parsed_bbox = str_to_bbox(bbox)
    datetime_interval = _str_to_interval(datetime)
    catalogs = [
        STACAPICollectionSearch(
            base_url=base_url,
            bbox=parsed_bbox,
            datetime=datetime_interval,
            text=text,
            hint_lang=hint_lang,
        )
        for base_url in settings.stac_api_urls
    ] + [
        CMRCollectionSearch(
            base_url=base_url,
            bbox=parsed_bbox,
            datetime=datetime_interval,
            text=text,
            hint_lang=hint_lang,
        )
        for base_url in settings.cmr_urls
    ]

    results = search_all(catalogs)

    return SearchResponse(results=itertools.islice(results, limit))


@app.get("/health")
def health(settings: Annotated[Settings, Depends(get_settings)]):
    statuses = {}
    base_api_searches: List[CollectionSearch] = []
    for stac_api_url in settings.stac_api_urls:
        base_api_searches.append(STACAPICollectionSearch(base_url=stac_api_url))

    for cmr_url in settings.cmr_urls:
        base_api_searches.append(CMRCollectionSearch(base_url=cmr_url))

    for catalog in base_api_searches:
        statuses[catalog.base_url] = catalog.check_health()

    return statuses
