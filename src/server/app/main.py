from typing import Annotated, Optional

from fastapi import FastAPI, Query
from stac_fastapi.types.rfc3339 import str_to_interval
from stac_fastapi.types.search import str2bbox
from stac_pydantic.shared import BBox

from app.catalog_search import (
    CMRCollectionSearch,
    DatetimeInterval,
    STACAPICollectionSearch,
)
from app.catalog_search_service import CatalogSearchService
from app.config import Settings
from app.models import SearchResponse


def _str2bbox(bbox_str: Optional[str] = None) -> Optional[BBox]:
    if bbox_str is None:
        return None

    return str2bbox(bbox_str)


def _str_to_interval(datetime_str: Optional[str] = None) -> Optional[DatetimeInterval]:
    if datetime_str is None:
        return None

    return str_to_interval(datetime_str)  # type: ignore


app = FastAPI()


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
):
    settings = Settings()
    # Initialize the service with the catalog instances
    catalog_service = CatalogSearchService(
        catalogs=[
            STACAPICollectionSearch(
                base_url=str(base_url),
                bbox=_str2bbox(bbox),
                datetime=_str_to_interval(datetime),
                text=text,
            )
            for base_url in settings.stac_api_urls
        ]
        + [
            CMRCollectionSearch(
                base_url=str(base_url),
                bbox=_str2bbox(bbox),
                datetime=_str_to_interval(datetime),
                text=text,
            )
            for base_url in settings.cmr_urls
        ]
    )

    # Fetch results using the service
    results = catalog_service.search_all()
    return {"results": results}
