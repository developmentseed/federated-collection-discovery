import itertools
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated, Any, List, Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import PositiveInt
from stac_fastapi.types.rfc3339 import str_to_interval

from federated_collection_discovery import __version__ as package_version
from federated_collection_discovery.cmr_collection_search import CMRCollectionSearch
from federated_collection_discovery.collection_search import (
    CollectionSearch,
    check_health,
    search_all,
)
from federated_collection_discovery.models import (
    CollectionMetadata,
    FederatedSearchError,
    SearchResponse,
    Settings,
)
from federated_collection_discovery.shared import BBox, DatetimeInterval
from federated_collection_discovery.stac_api_collection_search import (
    STACAPICollectionSearch,
)

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


async def get_settings(
    stac_api_urls: Annotated[
        Optional[str],
        Query(
            description="Comma-separated STAC API urls. If not provided, will fall "
            "back to the defaults listed in the description.",
            json_schema_extra={
                "example": "https://stac.maap-project.org/,https://catalogue.dataspace.copernicus.eu/stac"
            },
        ),
    ] = None,
    cmr_urls: Annotated[
        Optional[str],
        Query(
            description="Comma-separated CMR search urls. If not provided, will fall "
            "back to the defaults listed in the description.",
            json_schema_extra={"example": "https://cmr.earthdata.nasa.gov/search/"},
        ),
    ] = None,
) -> Settings:
    """Use provided values if they are not null, defaults to reading from
    environment variables
    """
    args = {}
    if stac_api_urls is not None:
        args["stac_api_urls"] = stac_api_urls
    if cmr_urls is not None:
        args["cmr_urls"] = cmr_urls

    return Settings(**args)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up resources")
    app.state.executor = ThreadPoolExecutor()

    yield

    # Clean up resources
    app.state.executor.shutdown(wait=True)
    print("Shutdown resources")


default_settings = Settings()
all_urls = default_settings.stac_api_urls + default_settings.cmr_urls
default_api_urls = (
    ", ".join(f"[{url}]({url})" for url in all_urls)
    if default_settings.stac_api_urls
    else "none"
)

description = f"""
Discover data collections from across a set of APIs by filtering 
collections using bounding box, datetime intervals, and/or keywords.

By default, this application will perform a collection-level search across all of these 
APIs:

{default_api_urls}
"""


app = FastAPI(
    title="Federated Collection Discovery API",
    description=description,
    lifespan=lifespan,
    version=package_version,
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)


def get_executor() -> ThreadPoolExecutor:
    return app.state.executor


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/search",
    summary="Federated collection search",
    response_model=SearchResponse,
)
async def search_collections(
    settings: Annotated[Settings, Depends(get_settings)],
    executor: Annotated[ThreadPoolExecutor, Depends(get_executor)],
    bbox: Annotated[
        Optional[str],
        Query(
            description="Bounding box coordinates (xmin, xmax, ymin, ymax) "
            "in EPSG:4326",
            json_schema_extra={
                "example": "-175.05, -85.05, 175.05, 85.05",
            },
        ),
    ] = None,
    datetime: Annotated[
        Optional[str],
        Query(
            description="Datetime interval formatted to RFC3339 (YYYY-MM-DDTHH:MM:SSZ) "
            "with dates separated by slashes. For open intervals use '..' on "
            "either side of the slash.",
            json_schema_extra={"example": "2024-08-01T00:00:00Z/.."},
        ),
    ] = None,
    q: Annotated[
        Optional[str],
        Query(
            description=(
                "string to search for in collection titles, "
                "descriptions, and keywords - following the syntax described in the "
                "[OGC API - Features Text Search Spec](https://docs.ogc.org/DRAFTS/24-031.html#q-parameter)"
            ),
            json_schema_extra={"example": "landsat OR sentinel"},
        ),
    ] = None,
    hint_lang: Annotated[
        Optional[Literal["python"]],
        Query(
            description="Language for code hint",
            json_schema_extra={"example": "python"},
        ),
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
            q=q,
            hint_lang=hint_lang,
        )
        for base_url in settings.stac_api_urls
    ] + [
        CMRCollectionSearch(
            base_url=base_url,
            bbox=parsed_bbox,
            datetime=datetime_interval,
            q=q,
            hint_lang=hint_lang,
        )
        for base_url in settings.cmr_urls
    ]

    search_results = await search_all(executor, catalogs)
    results = []
    errors = []
    for search_result in itertools.islice(search_results, limit):
        if isinstance(search_result, CollectionMetadata):
            results.append(search_result)
        if isinstance(search_result, FederatedSearchError):
            errors.append(search_result)

    return SearchResponse(results=results, errors=errors)


@app.get(
    "/health",
    summary="Check API health",
    description="Check health of the underlying APIs",
)
async def health(
    settings: Annotated[Settings, Depends(get_settings)],
    executor: Annotated[ThreadPoolExecutor, Depends(get_executor)],
) -> dict[str, str]:
    base_api_searches: List[CollectionSearch] = []
    for stac_api_url in settings.stac_api_urls:
        base_api_searches.append(STACAPICollectionSearch(base_url=stac_api_url))

    for cmr_url in settings.cmr_urls:
        base_api_searches.append(CMRCollectionSearch(base_url=cmr_url))

    health_dict = await check_health(executor, base_api_searches)

    return health_dict


@app.get("/apis", summary="Get list of APIs")
async def apis(
    settings: Annotated[Settings, Depends(get_settings)],
):
    return {
        "stac_api": settings.stac_api_urls,
        "cmr": settings.cmr_urls,
    }


@app.get("/", response_class=RedirectResponse)
async def redirect_to_docs():
    return RedirectResponse(url="/docs")


def create_handler(app):
    """Create a handler to use with AWS Lambda if mangum available."""
    try:
        from mangum import Mangum

        return Mangum(app)
    except ImportError:
        return None


handler = create_handler(app)
