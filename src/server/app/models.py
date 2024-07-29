from typing import Any, Iterable, List, Optional

from pydantic import BaseModel


class CollectionMetadata(BaseModel):
    id: str
    catalog_url: str
    title: str
    spatial_extent: Any
    temporal_extent: Any
    short_name: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = []
    hint: Optional[str] = None


class FederatedSearchError(BaseModel):
    catalog_url: str
    error_message: str


class SearchResponse(BaseModel):
    results: Iterable[CollectionMetadata]
    errors: List[FederatedSearchError]
