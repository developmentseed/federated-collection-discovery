from enum import Enum
from typing import Optional

import black
from stac_pydantic.shared import BBox

from federated_collection_discovery.shared import DatetimeInterval


class Packages(str, Enum):
    PYSTAC_CLIENT = "pystac-client"
    PYTHON_CMR = "python-cmr"
    EARTHACCESS = "earthaccess"
    RSTAC = "rstac"


PYTHON = "python"
PYSTAC_CLIENT_HINT = """# set up an item search with pystac_client
import pystac_client

catalog = pystac_client.Client.open("{base_url}")

# get a sample of 10 items
search = catalog.search(collections="{collection_id}", {other} max_items=10,)
items = search.items()
"""

CMR_PYTHON_HINT = """# set up a granule search with python-cmr
from cmr import GranuleQuery

# get a sample of 10 granules
search = GranuleQuery(mode="{base_url}").short_name("{short_name}"){other}
granules = search.get(10)
"""

EARTHACCESS_HINT = """# set up a granule search with earthaccess
import earthaccess

earthaccess.login()

# get a sample of 10 granules
results = earthaccess.search_data(
    short_name="{short_name}", {other} count=10,
)
"""

RSTAC_HINT = """# set up an item search with rstac
library(rstac)

catalog <- stac("{base_url}")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "{collection_id}",{other}
    limit = 10
  ) |>
  get_request()"""


def generate_pystac_client_hint(
    base_url: str,
    collection_id: str,
    bbox: Optional[BBox] = None,
    datetime_interval: Optional[DatetimeInterval] = None,
) -> str:
    """Generate a Python snippet for an item search using pystac-client"""
    other = ""
    if bbox:
        other += f'bbox=({",".join([str(coord) for coord in bbox])}),'

    if datetime_interval:
        datetime_string = "/".join(
            dt.strftime("%Y-%m-%dT%H:%M:%SZ") if dt else ".."  # type: ignore
            for dt in datetime_interval
        )
        other += f'datetime="{datetime_string}",'

    formatted_hint = PYSTAC_CLIENT_HINT.format(
        base_url=base_url, collection_id=collection_id, other=other
    )

    if not other:
        formatted_hint += (
            "\n# consider using the bbox and/or datetime filters for a "
            "more targeted search"
        )

    return black.format_str(formatted_hint, mode=black.FileMode())


def generate_python_cmr_hint(
    base_url: str,
    short_name: str,
    bbox: Optional[BBox] = None,
    datetime_interval: Optional[DatetimeInterval] = None,
) -> str:
    """Generate a Python snippet for a granule search using python-cmr"""
    other = ""

    if bbox:
        other += f'.bounding_box({", ".join([str(coord) for coord in bbox])})'

    if datetime_interval:
        datetime_strings = [
            f'"{dt.strftime("%Y-%m-%dT%H:%M:%SZ")}"' if dt else "None"
            for dt in datetime_interval
        ]
        other += f".temporal({','.join(datetime_strings)})"

    cmr_hint = CMR_PYTHON_HINT.format(
        base_url=base_url,
        short_name=short_name.strip(),
        other=other,
    )

    if not other:
        cmr_hint += (
            "\n# consider applying a bounding box and/or temporal filter for a "
            "more targeted search"
        )

    return black.format_str(cmr_hint, mode=black.FileMode())


def generate_earthaccess_hint(
    short_name: str,
    bbox: Optional[BBox] = None,
    datetime_interval: Optional[DatetimeInterval] = None,
) -> str:
    """Generate a Python snippet for a granule search using earthaccess"""

    other = ""

    if bbox:
        other += f'bounding_box=({",".join([str(coord) for coord in bbox])}),'

    if datetime_interval:
        datetime_strings = [
            f'"{dt.strftime("%Y-%m-%dT%H:%M:%SZ")}"' if dt else "None"
            for dt in datetime_interval
        ]
        other += f"temporal=({','.join(datetime_strings)}),"

    formatted_hint = EARTHACCESS_HINT.format(
        short_name=short_name.strip(),
        other=other,
    )

    if not other:
        formatted_hint += (
            "\n# consider using the bounding_box and/or temporal arguments for a "
            "more targeted search"
        )

    return black.format_str(formatted_hint, mode=black.FileMode())


def generate_rstac_hint(
    base_url: str,
    collection_id: str,
    bbox: Optional[BBox] = None,
    datetime_interval: Optional[DatetimeInterval] = None,
) -> str:
    """Generate R snippet for an item search using rstac"""
    other = ""
    if bbox:
        other += f'\n    bbox = c({", ".join([str(coord) for coord in bbox])}),'

    if datetime_interval:
        datetime_string = "/".join(
            dt.strftime("%Y-%m-%dT%H:%M:%SZ") if dt else ".."  # type: ignore
            for dt in datetime_interval
        )
        other += f'\n    datetime = "{datetime_string}",'

    formatted_hint = RSTAC_HINT.format(
        base_url=base_url, collection_id=collection_id, other=other
    )

    if not other:
        formatted_hint += (
            "\n# consider using the bbox and/or datetime args for a more "
            "targeted search"
        )

    return formatted_hint
