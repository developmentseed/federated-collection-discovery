from fastapi import Depends, FastAPI, Query
from typing import Optional

from stac_fastapi.types.rfc3339 import DateTimeType, str_to_interval
from stac_fastapi.types.search import str2bbox
from stac_pydantic.shared import BBox

from app.catalog_search import DatetimeInterval, STACAPICollectionSearch
from app.catalog_search_service import CatalogSearchService
from app.models import SearchResponse


def _str2bbox(bbox_str: Optional[str] = None) -> Optional[BBox]:
    if bbox_str is None:
        return None

    return str2bbox(bbox_str)


def _str_to_interval(datetime_str: Optional[str] = None) -> Optional[DateTimeType]:
    if datetime_str is None:
        return None

    return str_to_interval(datetime_str)


app = FastAPI()


CATALOG_CONFIGS = [
    (STACAPICollectionSearch, "https://cmr.earthdata.nasa.gov/stac/LPCLOUD"),
    (STACAPICollectionSearch, "https://earth-search.aws.element84.com/v1/"),
]


@app.get(
    "/search",
    response_model=SearchResponse,
)
def search_collections(
    bbox: Optional[BBox] = Depends(_str2bbox),
    datetime: Optional[DatetimeInterval] = Depends(_str_to_interval),
    text: Optional[str] = Query(None),
):

    # Initialize the service with the catalog instances
    catalog_service = CatalogSearchService(
        catalogs=[
            cls(
                base_url=base_url,
                bbox=bbox,
                datetime=datetime,
                text=text,
            )
            for cls, base_url in CATALOG_CONFIGS
        ]
    )

    # Fetch results using the service
    results = catalog_service.search_all()
    return {"results": results}
