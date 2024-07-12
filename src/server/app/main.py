from typing import Annotated, List, Literal, Optional, Union

from fastapi import FastAPI, Query
from stac_fastapi.types.rfc3339 import str_to_interval
from stac_fastapi.types.search import str2bbox
from stac_pydantic.shared import BBox

from app.catalog_collection_search import DatetimeInterval
from app.catalog_search_service import CatalogSearchService
from app.cmr_collection_search import CMRCollectionSearch
from app.config import Settings
from app.models import SearchResponse
from app.stac_api_collection_search import STACAPICollectionSearch


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
    hint_lang: Annotated[
        Optional[Literal["python"]],
        Query(description="Language for code hint, either python or ..."),
    ] = None,
    limit: Annotated[
        int, Query(description=("limit for number of returned collection records"))
    ] = 100,
):
    settings = Settings()
    # Initialize the service with the catalog instances
    catalogs: List[Union[CMRCollectionSearch, STACAPICollectionSearch]] = []
    if settings.stac_api_urls:
        catalogs.extend(
            [
                STACAPICollectionSearch(
                    base_url=str(base_url),
                    bbox=_str2bbox(bbox),
                    datetime=_str_to_interval(datetime),
                    text=text,
                    limit=limit,
                    hint_lang=hint_lang,
                )
                for base_url in settings.stac_api_urls
            ]
        )
    if settings.cmr_urls:
        catalogs.extend(
            [
                CMRCollectionSearch(
                    base_url=str(base_url),
                    bbox=_str2bbox(bbox),
                    datetime=_str_to_interval(datetime),
                    text=text,
                    limit=limit,
                    hint_lang=hint_lang,
                )
                for base_url in settings.cmr_urls
            ]
        )
    catalog_service = CatalogSearchService(catalogs=catalogs)

    # Fetch results using the service
    results = catalog_service.search_all()
    return {"results": results}
