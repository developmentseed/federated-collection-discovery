from typing import Optional

import black
from stac_pydantic.shared import BBox

from federated_collection_discovery.shared import DatetimeInterval

PYTHON = "python"
PYSTAC_CLIENT_HINT = """import pystac_client

catalog = pystac_client.Client.open("{base_url}")
search = catalog.search(collections="{collection_id}"{remainder})
item_collection = search.item_collection()
"""

CMR_PYTHON_HINT = """from cmr import GranuleQuery

search = GranuleQuery(mode="{base_url}").short_name("{short_name}"){remainder}
granules = search.get()
"""


def generate_pystac_client_hint(
    base_url: str,
    collection_id: str,
    bbox: Optional[BBox] = None,
    datetime_interval: Optional[DatetimeInterval] = None,
) -> str:
    # Prepare bbox line if bbox is provided, otherwise use an empty string
    remainder = "," if (bbox or datetime_interval) else ""
    if bbox:
        remainder += f'bbox=({",".join([str(coord) for coord in bbox])}),'

    # Prepare datetime line if datetime is provided, otherwise use an empty string
    if datetime_interval:
        datetime_string = "/".join(
            dt.strftime("%Y-%m-%dT%H:%M:%SZ") if dt else ".."  # type: ignore
            for dt in datetime_interval
        )
        remainder += f'datetime="{datetime_string}",'

    formatted_hint = PYSTAC_CLIENT_HINT.format(
        base_url=base_url, collection_id=collection_id, remainder=remainder
    )

    return black.format_str(formatted_hint, mode=black.FileMode())


def generate_cmr_hint(
    base_url: str,
    short_name: str,
    bbox: Optional[BBox] = None,
    datetime_interval: Optional[DatetimeInterval] = None,
):
    remainder = ""

    if bbox:
        remainder += f'.bounding_box({", ".join([str(coord) for coord in bbox])})'

    if datetime_interval:
        datetime_strings = [
            f'"{dt.strftime("%Y-%m-%dT%H:%M:%SZ")}"' if dt else "None"
            for dt in datetime_interval
        ]
        remainder += f".temporal({','.join(datetime_strings)})"

    formatted_hint = CMR_PYTHON_HINT.format(
        base_url=base_url,
        short_name=short_name.strip(),
        remainder=remainder,
    )

    return black.format_str(formatted_hint, mode=black.FileMode())
