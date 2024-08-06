from datetime import datetime

import black

from federated_collection_discovery.hint import (
    generate_cmr_hint,
    generate_pystac_client_hint,
)


def test_cmr_hint_no_params():
    hint = generate_cmr_hint(
        base_url="https://cmr1.net",
        short_name="dataset-1",
    )
    expected_hint = black.format_str(
        (
            "from cmr import GranuleQuery\n\n"
            'search = GranuleQuery(mode="https://cmr1.net").short_name("dataset-1")\n'
            "granules = search.get()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_cmr_hint_with_bbox():
    hint = generate_cmr_hint(
        base_url="https://cmr2.net",
        short_name="dataset-2",
        bbox=(10, 20, 30, 40),
    )
    expected_hint = black.format_str(
        (
            "from cmr import GranuleQuery\n\n"
            'search = GranuleQuery(mode="https://cmr2.net").short_name("dataset-2")'
            ".bounding_box(10, 20, 30, 40)\n"
            "granules = search.get()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_cmr_hint_with_datetime_interval():
    hint = generate_cmr_hint(
        base_url="https://cmr3.net",
        short_name="dataset-3",
        datetime_interval=(
            datetime(2023, 1, 1, 0, 0, 0),
            datetime(2023, 12, 31, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "from cmr import GranuleQuery\n\n"
            'search = GranuleQuery(mode="https://cmr3.net").short_name("dataset-3")'
            '.temporal("2023-01-01T00:00:00Z","2023-12-31T23:59:59Z")\n'
            "granules = search.get()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()

    hint = generate_cmr_hint(
        base_url="https://cmr3.net",
        short_name="dataset-3",
        datetime_interval=(
            None,
            datetime(2023, 12, 31, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "from cmr import GranuleQuery\n\n"
            'search = GranuleQuery(mode="https://cmr3.net").short_name("dataset-3")'
            '.temporal(None,"2023-12-31T23:59:59Z")\n'
            "granules = search.get()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()

    hint = generate_cmr_hint(
        base_url="https://cmr3.net",
        short_name="dataset-3",
        datetime_interval=(
            datetime(2023, 1, 1, 0, 0, 0),
            None,
        ),
    )
    expected_hint = black.format_str(
        (
            "from cmr import GranuleQuery\n\n"
            'search = GranuleQuery(mode="https://cmr3.net").short_name("dataset-3")'
            '.temporal("2023-01-01T00:00:00Z",None)\n'
            "granules = search.get()"
        ),
        mode=black.FileMode(),
    )
    assert hint.strip() == expected_hint.strip()


def test_cmr_hint_with_bbox_and_datetime_interval():
    hint = generate_cmr_hint(
        base_url="https://cmr4.net",
        short_name="dataset-4",
        bbox=(10, 20, 30, 40),
        datetime_interval=(
            datetime(2022, 6, 1, 0, 0, 0),
            datetime(2022, 6, 30, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "from cmr import GranuleQuery\n\n"
            'search = GranuleQuery(mode="https://cmr4.net").short_name("dataset-4")'
            ".bounding_box(10, 20, 30, 40)"
            '.temporal("2022-06-01T00:00:00Z","2022-06-30T23:59:59Z")\n'
            "granules = search.get()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_pystac_client_hint_no_params():
    hint = generate_pystac_client_hint(
        base_url="https://stac1.net",
        collection_id="collection-1",
    )
    expected_hint = black.format_str(
        (
            "import pystac_client\n\n"
            'catalog = pystac_client.Client.open("https://stac1.net")\n'
            'search = catalog.search(collections="collection-1")\n'
            "item_collection = search.item_collection()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_pystac_client_hint_with_bbox():
    hint = generate_pystac_client_hint(
        base_url="https://stac2.net",
        collection_id="collection-2",
        bbox=(10, 20, 30, 40),
    )
    expected_hint = black.format_str(
        (
            "import pystac_client\n\n"
            'catalog = pystac_client.Client.open("https://stac2.net")\n'
            'search = catalog.search(collections="collection-2",'
            "bbox=(10,20,30,40),)\n"
            "item_collection = search.item_collection()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_pystac_client_hint_with_datetime_interval():
    hint = generate_pystac_client_hint(
        base_url="https://stac3.net",
        collection_id="collection-3",
        datetime_interval=(
            datetime(2023, 1, 1, 0, 0, 0),
            datetime(2023, 12, 31, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "import pystac_client\n\n"
            'catalog = pystac_client.Client.open("https://stac3.net")\n'
            'search = catalog.search(collections="collection-3", '
            'datetime="2023-01-01T00:00:00Z/2023-12-31T23:59:59Z",)\n'
            "item_collection = search.item_collection()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_pystac_client_hint_with_bbox_and_datetime_interval():
    hint = generate_pystac_client_hint(
        base_url="https://stac4.net",
        collection_id="collection-4",
        bbox=(10, 20, 30, 40),
        datetime_interval=(
            datetime(2022, 6, 1, 0, 0, 0),
            datetime(2022, 6, 30, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "import pystac_client\n"
            'catalog = pystac_client.Client.open("https://stac4.net")\n'
            "search = catalog.search("
            'collections="collection-4",'
            "bbox=(10,20,30,40),\n"
            'datetime="2022-06-01T00:00:00Z/2022-06-30T23:59:59Z")\n'
            "item_collection = search.item_collection()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()
