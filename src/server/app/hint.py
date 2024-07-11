from typing import Optional

import black
from stac_pydantic.shared import BBox

from app.shared import DatetimeInterval

PYTHON_HINT = """import pystac_client

catalog = pystac_client.Client.open("{base_url}")
search = catalog.search(collections="{collection_id}"{remainder})
item_collection = search.item_collection()
"""


def generate_python_hint(
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
            dt.strftime("%Y-%m-%dT%H:%M:%SZ")  # type: ignore
            for dt in datetime_interval
        )
        remainder += f'datetime="{datetime_string}",'

    formatted_hint = PYTHON_HINT.format(
        base_url=base_url, collection_id=collection_id, remainder=remainder
    )

    return black.format_str(formatted_hint, mode=black.FileMode())
