import itertools
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Iterable, Literal, Optional

from app.models import CollectionMetadata
from app.shared import BBox, DatetimeInterval


@dataclass
class CollectionSearch(ABC):
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


async def search_all(
    executor: ThreadPoolExecutor,
    catalogs: Iterable[CollectionSearch],
) -> Iterable[CollectionMetadata]:
    return itertools.chain.from_iterable(
        executor.map(lambda catalog: catalog.get_collection_metadata(), catalogs)
    )
