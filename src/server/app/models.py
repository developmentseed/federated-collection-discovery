from typing import Any, List, Optional

from pydantic import BaseModel


class CollectionMetadata(BaseModel):
    id: str
    catalog_url: str
    title: str
    spatial_extent: Any
    temporal_extent: Any
    description: Optional[str] = None
    keywords: Optional[List[str]] = []
    hint: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[CollectionMetadata]
