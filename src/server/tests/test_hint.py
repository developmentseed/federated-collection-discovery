from datetime import datetime

import black

from federated_collection_discovery.hint import (
    generate_earthaccess_hint,
    generate_pystac_client_hint,
    generate_python_cmr_hint,
    generate_rstac_hint,
)


def test_python_cmr_hint_no_params():
    hint = generate_python_cmr_hint(
        base_url="https://cmr1.net",
        short_name="dataset-1",
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with python-cmr\n"
            "from cmr import GranuleQuery\n\n"
            "# get a sample of 10 granules\n"
            'search = GranuleQuery(mode="https://cmr1.net").short_name("dataset-1")\n'
            "granules = search.get(10)\n\n"
            "# consider applying a bounding box and/or temporal filter for a "
            "more targeted search"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_cmr_hint_with_bbox():
    hint = generate_python_cmr_hint(
        base_url="https://cmr2.net",
        short_name="dataset-2",
        bbox=(10, 20, 30, 40),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with python-cmr\n"
            "from cmr import GranuleQuery\n\n"
            "# get a sample of 10 granules\n"
            'search = GranuleQuery(mode="https://cmr2.net").short_name("dataset-2")'
            ".bounding_box(10, 20, 30, 40)\n"
            "granules = search.get(10)"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_cmr_hint_with_datetime_interval():
    hint = generate_python_cmr_hint(
        base_url="https://cmr3.net",
        short_name="dataset-3",
        datetime_interval=(
            datetime(2023, 1, 1, 0, 0, 0),
            datetime(2023, 12, 31, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with python-cmr\n"
            "from cmr import GranuleQuery\n\n"
            "# get a sample of 10 granules\n"
            'search = GranuleQuery(mode="https://cmr3.net").short_name("dataset-3")'
            '.temporal("2023-01-01T00:00:00Z","2023-12-31T23:59:59Z")\n'
            "granules = search.get(10)"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()

    hint = generate_python_cmr_hint(
        base_url="https://cmr3.net",
        short_name="dataset-3",
        datetime_interval=(
            None,
            datetime(2023, 12, 31, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with python-cmr\n"
            "from cmr import GranuleQuery\n\n"
            "# get a sample of 10 granules\n"
            'search = GranuleQuery(mode="https://cmr3.net").short_name("dataset-3")'
            '.temporal(None,"2023-12-31T23:59:59Z")\n'
            "granules = search.get(10)"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()

    hint = generate_python_cmr_hint(
        base_url="https://cmr3.net",
        short_name="dataset-3",
        datetime_interval=(
            datetime(2023, 1, 1, 0, 0, 0),
            None,
        ),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with python-cmr\n"
            "from cmr import GranuleQuery\n\n"
            "# get a sample of 10 granules\n"
            'search = GranuleQuery(mode="https://cmr3.net").short_name("dataset-3")'
            '.temporal("2023-01-01T00:00:00Z",None)\n'
            "granules = search.get(10)"
        ),
        mode=black.FileMode(),
    )
    assert hint.strip() == expected_hint.strip()


def test_cmr_hint_with_bbox_and_datetime_interval():
    hint = generate_python_cmr_hint(
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
            "# set up a granule search with python-cmr\n"
            "from cmr import GranuleQuery\n\n"
            "# get a sample of 10 granules\n"
            'search = GranuleQuery(mode="https://cmr4.net").short_name("dataset-4")'
            ".bounding_box(10, 20, 30, 40)"
            '.temporal("2022-06-01T00:00:00Z","2022-06-30T23:59:59Z")\n'
            "granules = search.get(10)"
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
            "# set up an item search with pystac_client\n"
            "import pystac_client\n\n"
            'catalog = pystac_client.Client.open("https://stac1.net")\n\n'
            "# get a sample of 10 items\n"
            'search = catalog.search(collections="collection-1",max_items=10,)\n'
            "items = search.items()\n\n"
            "# consider using the bbox and/or datetime filters for a "
            "more targeted search"
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
            "# set up an item search with pystac_client\n"
            "import pystac_client\n\n"
            'catalog = pystac_client.Client.open("https://stac2.net")\n\n'
            "# get a sample of 10 items\n"
            'search = catalog.search(collections="collection-2",'
            "bbox=(10,20,30,40),"
            "max_items=10,)\n"
            "items = search.items()"
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
            "# set up an item search with pystac_client\n"
            "import pystac_client\n\n"
            'catalog = pystac_client.Client.open("https://stac3.net")\n\n'
            "# get a sample of 10 items\n"
            'search = catalog.search(collections="collection-3", '
            'datetime="2023-01-01T00:00:00Z/2023-12-31T23:59:59Z",'
            "max_items=10,)\n"
            "items = search.items()"
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
            "# set up an item search with pystac_client\n"
            "import pystac_client\n"
            'catalog = pystac_client.Client.open("https://stac4.net")\n\n'
            "# get a sample of 10 items\n"
            "search = catalog.search("
            'collections="collection-4",'
            "bbox=(10,20,30,40),\n"
            'datetime="2022-06-01T00:00:00Z/2022-06-30T23:59:59Z",\n'
            "max_items=10,)\n"
            "items = search.items()"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_rstac_hint_no_parameters():
    hint = generate_rstac_hint(
        base_url="https://stac4.net",
        collection_id="collection-4",
    )
    expected_hint = """# set up an item search with rstac
library(rstac)

catalog <- stac("https://stac4.net")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "collection-4",
    limit = 10
  ) |>
  get_request()
# consider using the bbox and/or datetime args for a more targeted search
"""

    assert hint.strip() == expected_hint.strip()


def test_rstac_hint_bbox():
    hint = generate_rstac_hint(
        base_url="https://stac4.net",
        collection_id="collection-4",
        bbox=(1, 2, 3, 4),
    )
    expected_hint = """# set up an item search with rstac
library(rstac)

catalog <- stac("https://stac4.net")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "collection-4",
    bbox = c(1, 2, 3, 4),
    limit = 10
  ) |>
  get_request()"""

    assert hint.strip() == expected_hint.strip()


def test_rstac_hint_datetime():
    hint = generate_rstac_hint(
        base_url="https://stac4.net",
        collection_id="collection-4",
        datetime_interval=(datetime(2024, 1, 1), datetime(2024, 2, 1)),
    )
    expected_hint = """# set up an item search with rstac
library(rstac)

catalog <- stac("https://stac4.net")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "collection-4",
    datetime = "2024-01-01T00:00:00Z/2024-02-01T00:00:00Z",
    limit = 10
  ) |>
  get_request()"""

    assert hint.strip() == expected_hint.strip()

    # open interval (no end)
    hint = generate_rstac_hint(
        base_url="https://stac4.net",
        collection_id="collection-4",
        datetime_interval=(datetime(2024, 1, 1), None),
    )
    expected_hint = """# set up an item search with rstac
library(rstac)

catalog <- stac("https://stac4.net")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "collection-4",
    datetime = "2024-01-01T00:00:00Z/..",
    limit = 10
  ) |>
  get_request()"""

    assert hint.strip() == expected_hint.strip()

    # open interval (no start)
    hint = generate_rstac_hint(
        base_url="https://stac4.net",
        collection_id="collection-4",
        datetime_interval=(None, datetime(2024, 1, 1)),
    )
    expected_hint = """# set up an item search with rstac
library(rstac)

catalog <- stac("https://stac4.net")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "collection-4",
    datetime = "../2024-01-01T00:00:00Z",
    limit = 10
  ) |>
  get_request()"""

    assert hint.strip() == expected_hint.strip()


def test_rstac_hint_bbox_and_datetime():
    hint = generate_rstac_hint(
        base_url="https://stac4.net",
        collection_id="collection-4",
        bbox=(1, 2, 3, 4),
        datetime_interval=(datetime(2024, 1, 1), datetime(2024, 2, 1)),
    )
    expected_hint = """# set up an item search with rstac
library(rstac)

catalog <- stac("https://stac4.net")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "collection-4",
    bbox = c(1, 2, 3, 4),
    datetime = "2024-01-01T00:00:00Z/2024-02-01T00:00:00Z",
    limit = 10
  ) |>
  get_request()"""

    assert hint.strip() == expected_hint.strip()


def test_earthaccess_hint_no_params():
    hint = generate_earthaccess_hint(
        short_name="dataset-1",
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with earthaccess\n"
            "import earthaccess\n\n"
            "earthaccess.login()\n\n"
            "# get a sample of 10 granules\n"
            'results = earthaccess.search_data(short_name="dataset-1",count=10,)\n\n'
            "# consider using the bounding_box and/or temporal arguments for a "
            "more targeted search"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_earthaccess_hint_with_bbox():
    hint = generate_earthaccess_hint(
        short_name="dataset-1",
        bbox=(10, 20, 30, 40),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with earthaccess\n"
            "import earthaccess\n\n"
            "earthaccess.login()\n\n"
            "# get a sample of 10 granules\n"
            'results = earthaccess.search_data(short_name="dataset-1",'
            "bounding_box=(10, 20, 30, 40),"
            "count=10,)"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()


def test_earthaccess_hint_with_datetime_interval():
    hint = generate_earthaccess_hint(
        short_name="dataset-1",
        datetime_interval=(
            datetime(2023, 1, 1, 0, 0, 0),
            datetime(2023, 12, 31, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with earthaccess\n"
            "import earthaccess\n\n"
            "earthaccess.login()\n\n"
            "# get a sample of 10 granules\n"
            'results = earthaccess.search_data(short_name="dataset-1",'
            'temporal=("2023-01-01T00:00:00Z","2023-12-31T23:59:59Z"),'
            "count=10,)"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()

    hint = generate_earthaccess_hint(
        short_name="dataset-1",
        datetime_interval=(
            None,
            datetime(2023, 12, 31, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with earthaccess\n"
            "import earthaccess\n\n"
            "earthaccess.login()\n\n"
            "# get a sample of 10 granules\n"
            'results = earthaccess.search_data(short_name="dataset-1",'
            'temporal=(None, "2023-12-31T23:59:59Z"),'
            "count=10,)"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()

    hint = generate_earthaccess_hint(
        short_name="dataset-1",
        datetime_interval=(
            datetime(2023, 1, 1, 0, 0, 0),
            None,
        ),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with earthaccess\n"
            "import earthaccess\n\n"
            "earthaccess.login()\n\n"
            "# get a sample of 10 granules\n"
            'results = earthaccess.search_data(short_name="dataset-1",'
            'temporal=("2023-01-01T00:00:00Z",None),'
            "count=10,)"
        ),
        mode=black.FileMode(),
    )
    assert hint.strip() == expected_hint.strip()


def test_earthaccess_hint_with_bbox_and_datetime_interval():
    hint = generate_earthaccess_hint(
        short_name="dataset-1",
        bbox=(10, 20, 30, 40),
        datetime_interval=(
            datetime(2022, 6, 1, 0, 0, 0),
            datetime(2022, 6, 30, 23, 59, 59),
        ),
    )
    expected_hint = black.format_str(
        (
            "# set up a granule search with earthaccess\n"
            "import earthaccess\n\n"
            "earthaccess.login()\n\n"
            "# get a sample of 10 granules\n"
            'results = earthaccess.search_data(short_name="dataset-1",'
            "bounding_box=(10,20,30,40),"
            'temporal=("2022-06-01T00:00:00Z","2022-06-30T23:59:59Z"),'
            "count=10,)"
        ),
        mode=black.FileMode(),
    )

    assert hint.strip() == expected_hint.strip()
