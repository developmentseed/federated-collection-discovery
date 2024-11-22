from typing import Any, Dict, Iterable, List, Optional

from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings

from federated_collection_discovery.hint import Packages


class Settings(BaseSettings):  # type: ignore
    stac_api_urls: str = Field(
        default="",
        description="comma separated list of STAC API URLs",
    )
    cmr_urls: str = Field(default="", description="comma separated list of CMR URLs")

    @field_validator("stac_api_urls")
    def parse_stac_api_urls(cls, v):
        return v.split(",") if v else []

    @field_validator("cmr_urls")
    def parse_cmr_urls(cls, v):
        return v.split(",") if v else []

    model_config = {"env_prefix": "FEDERATED_", "env_file": ".env"}


class CollectionMetadata(BaseModel):
    id: str
    catalog_url: str
    title: str
    spatial_extent: Any
    temporal_extent: Any
    description: Optional[str] = None
    keywords: Optional[List[str]] = []
    hint: Optional[Dict[Packages, str]] = None


class FederatedSearchError(BaseModel):
    catalog_url: str
    error_message: str


class SearchResponse(BaseModel):
    results: Iterable[CollectionMetadata]
    errors: List[FederatedSearchError]
