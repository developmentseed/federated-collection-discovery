import itertools
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterable, Literal, Optional

from app.models import CollectionMetadata
from app.shared import BBox, DatetimeInterval

DEFAULT_LIMIT = 100


@dataclass
class CatalogCollectionSearch(ABC):
    base_url: str
    bbox: Optional[BBox] = None
    datetime: Optional[DatetimeInterval] = None
    text: Optional[str] = None
    hint_lang: Optional[Literal["python"]] = None

    @abstractmethod
    def get_collection_metadata(self) -> Iterable[CollectionMetadata]:
        pass

    @abstractmethod
    def check_health(self) -> str:
        pass


def search_all(
    catalogs: Iterable[CatalogCollectionSearch],
) -> Iterable[CollectionMetadata]:
    return itertools.chain.from_iterable(
        catalog.get_collection_metadata() for catalog in catalogs
    )
