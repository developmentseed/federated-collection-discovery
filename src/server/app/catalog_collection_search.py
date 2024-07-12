from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Literal, Optional

from app.models import CollectionMetadata
from app.shared import BBox, DatetimeInterval

DEFAULT_LIMIT = 100


@dataclass
class CatalogCollectionSearch(ABC):
    base_url: str
    bbox: Optional[BBox] = None
    datetime: Optional[DatetimeInterval] = None
    limit: int = DEFAULT_LIMIT
    text: Optional[str] = None
    hint_lang: Optional[Literal["python"]] = None

    @abstractmethod
    def get_collection_metadata(self) -> List[CollectionMetadata]:
        pass
