import asyncio
import itertools
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Callable, Iterable, Literal, Optional

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


async def async_wrapper(executor: ThreadPoolExecutor, func: Callable, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, func, *args, **kwargs)


async def search_all(
    executor: ThreadPoolExecutor,
    catalogs: Iterable[CollectionSearch],
) -> Iterable[CollectionMetadata]:
    tasks = [
        async_wrapper(executor, catalog.get_collection_metadata) for catalog in catalogs
    ]
    results = await asyncio.gather(*tasks)  # Execute concurrently
    return itertools.chain.from_iterable(results)
