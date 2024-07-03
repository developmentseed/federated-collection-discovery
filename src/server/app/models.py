from pydantic import BaseModel
from typing import List, Optional


class CollectionMetadata(BaseModel):
    catalog_url: str
    id: str
    title: str
    description: Optional[str] = None
    keywords: Optional[List[str]] = []


class SearchResponse(BaseModel):
    results: List[CollectionMetadata]
