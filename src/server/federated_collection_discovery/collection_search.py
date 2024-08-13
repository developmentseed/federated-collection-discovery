import itertools
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Iterable, Literal, Optional, Union

from federated_collection_discovery.models import (
    CollectionMetadata,
    FederatedSearchError,
)
from federated_collection_discovery.shared import BBox, DatetimeInterval


@dataclass
class CollectionSearch(ABC):
    base_url: str
    bbox: Optional[BBox] = None
    datetime: Optional[DatetimeInterval] = None
    q: Optional[str] = None
    hint_lang: Optional[Literal["python"]] = None

    @abstractmethod
    def get_collection_metadata(
        self,
    ) -> Iterable[Union[CollectionMetadata, FederatedSearchError]]:
        pass

    @abstractmethod
    def check_health(self) -> str:
        pass


async def search_all(
    executor: ThreadPoolExecutor,
    catalogs: Iterable[CollectionSearch],
) -> Iterable[Union[CollectionMetadata, FederatedSearchError]]:
    return itertools.chain.from_iterable(
        executor.map(lambda catalog: catalog.get_collection_metadata(), catalogs)
    )


async def check_health(
    executor: ThreadPoolExecutor,
    catalogs: Iterable[CollectionSearch],
) -> dict[str, str]:
    statuses = executor.map(lambda catalog: catalog.check_health(), catalogs)

    return {catalog.base_url: status for catalog, status in zip(catalogs, statuses)}
