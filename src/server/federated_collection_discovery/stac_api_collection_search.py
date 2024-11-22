from typing import Iterable, Union

from pystac import Collection
from pystac_client.client import Client
from pystac_client.exceptions import APIError

from federated_collection_discovery.collection_search import CollectionSearch
from federated_collection_discovery.hint import (
    Packages,
    generate_pystac_client_hint,
    generate_rstac_hint,
)
from federated_collection_discovery.models import (
    CollectionMetadata,
    FederatedSearchError,
)


class STACAPICollectionSearch(CollectionSearch):
    def check_health(self) -> str:
        try:
            catalog = Client.open(self.base_url)

            return (
                "healthy"
                if catalog.conforms_to("CORE")
                else "does not conform to the 'core' conformance class"
            )

        except APIError:
            return "cannot be opened by pystac_client"

    def get_collection_metadata(
        self,
    ) -> Iterable[Union[CollectionMetadata, FederatedSearchError]]:
        try:
            client = Client.open(self.base_url)

            # add /collections conformance class just in case it's missing...
            # https://github.com/stac-utils/pystac-client/issues/320
            # cmr-stac is still missing this conformance class
            # https://github.com/nasa/cmr-stac/issues/236
            # this makes it possible to iterate through all collections
            client.add_conforms_to("COLLECTIONS")

            results = client.collection_search(
                bbox=self.bbox,
                datetime=self.datetime,
                q=self.q,
            )

            yield from (
                self.collection_metadata(collection)
                for collection in results.collections()
            )

        except APIError as e:
            yield FederatedSearchError(catalog_url=self.base_url, error_message=str(e))

    def collection_metadata(self, collection: Collection) -> CollectionMetadata:
        hint = {
            Packages.PYSTAC_CLIENT: generate_pystac_client_hint(
                base_url=self.base_url,
                collection_id=collection.id,
                bbox=self.bbox,
                datetime_interval=self.datetime,
            ),
            Packages.RSTAC: generate_rstac_hint(
                base_url=self.base_url,
                collection_id=collection.id,
                bbox=self.bbox,
                datetime_interval=self.datetime,
            ),
        }

        extent_dict = collection.extent.to_dict()

        return CollectionMetadata(
            catalog_url=self.base_url,
            id=collection.id,
            title=collection.title or "no title",
            spatial_extent=extent_dict["spatial"]["bbox"],
            temporal_extent=extent_dict["temporal"]["interval"],
            description=collection.description,
            keywords=collection.keywords or [],
            hint=hint,
        )
