# Federated Collection Discovery

<img
    src="src/client/src/assets/logo.svg"
    alt="federated collection discovery logo is a modified version of the
    proposed Fediverse logo but with a geographic theme"
    width="200"
/>

This project makes it possible to search across multiple
geospatial metadata catalogs, such as STAC and NASA CMR, based on provided
search parameters like bounding box (bbox), datetime, and free-text
criteria to return collection-level metadata and code hints for accessing
items.

## Table of Contents

- [Development](#development)
- [Running with `docker compose`](#running-with-docker-compose)
- [Running in local environment](#running-in-local-environment)
- [API Endpoints](#api-endpoints)
- [Example API usage](#example-api-usage)

## Development

### Installation

```bash
uv sync
yarn install
```

### Testing

Run the python unit tests with `pytest`

```bash
uv run pytest
```

## Running with `docker compose`

Ensure Docker and Docker Compose are installed. Follow the steps below to
build and start the containers:

Build and start the services:

```bash
docker compose up --build
```

This will use the `FEDERATED_STAC_API_URLS` and
`FEDERATED_CMR_URLS` environment variables
defined in [docker-compose.yaml](./docker-compose.yaml) to search across
NASA's MAAP STAC API and VEDA STAC API, and ESA's STAC API

Stop the services:

```bash
docker compose down
```

Once the Docker containers are running, you can access the application at the
same endpoints:

- Backend (FastAPI): `http://localhost:8000`
- Frontend (React): `http://localhost:3000`

## Running in local environment

### 1. Install Dependencies with `uv`

```bash
uv sync
```

### 2. Run the Application

Start the API server

```bash
uv run uvicorn federated_collection_discovery.main:app \
  --host 0.0.0.0 --port 8000 --reload
```

Start the React development server:

```bash
yarn install 
yarn start 
```

Access the application:

- Backend (FastAPI): `http://localhost:8000`
- Frontend (React): `http://localhost:3000`

## API Endpoints

### `/search`

Initiates a search for collections that match the specified criteria.

- **Method:** `GET`
- **Parameters:**
  - `bbox` (query parameter, comma separated list of floats)
  - `datetime` (query parameter, datetime range separated by `/`, e.g.
    `2024-06-01T00:00:00Z/2024-07-12T12:00:00Z`)
  - `q` (query parameter, str)
- **Response:**
  - A JSON object containing an array of results.

Example Requests:

1. Look for collections with `'hls'` in one of the text fields and data from 2020:

    ```bash
    curl -X GET \
      "http://localhost:8000/search?` \
      `bbox=-180.0,-90.0,180.0,90.0&` \
      `datetime=2020-01-01T00:00:00Z/2020-12-31T23:59:59Z&` \
      `q=hls" | jq
    ```

2. Look for collections with `'elevation'` in one of the text fields that intersects
a part of North America:

    ```bash
    curl -X GET \
      "http://localhost:8000/search?` \
      `bbox=-120,40,-110,50&` \
      `q=elevation" | jq
    ```

The arguments are consistent with the STAC API Item Search spec.

## Example API usage

The federated collection discovery API allows you to run a search against
collection-level metadata in multiple APIs.
You can specify a `bbox` to filter collections by spatial extent, `datetime`
for filtering by temporal extent, and `q` for applying free-text search
filters.

> [!NOTE]
> The example below will return collections that include the terms 'DEM' or
'elevation' but not collections that include 'biomass'.

```python
import httpx
import pandas as pd

# this is the url for the API if you are running it in the docker network
API_URL = "http://localhost:8000"

search_request = httpx.get(
    f"{API_URL}/search",
    params={
        "q": "elevation OR DEM -biomass"
    },
    timeout=20,
)
search_request.raise_for_status()
search_results = search_request.json()
```

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right">
      <th></th>
      <th>id</th>
      <th>catalog_url</th>
      <th>title</th>
      <th>spatial_extent</th>
      <th>temporal_extent</th>
      <th>short_name</th>
      <th>description</th>
      <th>keywords</th>
      <th>hint</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>ABoVE_UAVSAR_PALSAR</td>
      <td>https://stac.maap-project.org/</td>
      <td>
        Arctic-Boreal Vulnerability Experiment Uninhabited Aerial Vehicle
        Synthetic Aperture Radar Polarimetric SAR
      </td>
      <td>[[-166.788382, 69.708769, -110.947561, 59.729364]]</td>
      <td>[[2017-06-13T22:03:35Z, 2017-06-22T19:25:35Z]]</td>
      <td>None</td>
      <td>
        The Arctic-Boreal Vulnerability Experiment (ABoVE) is a NASA Terrestrial
        Ecology Program field campaign conducted from June through September
        2017 over Alaska and Western Canada. ABoVE is a large-scale study of
        environmental change and to assess the vulnerability and resilience of
        Arctic and boreal ecosystems and provide scientific bases for societal
        response decision making. ABoVE utilized the Uninhabited Aerial Vehicle
        Synthetic Aperture Radar (UAVSAR) Polarimetric SAR (PALSAR) instrument
        to provide image transects to survey the land surface, hydrological
        systems and vegetation. SAR products in this collection include the
        Digital Elevation Model (DEM), the local incidence angle, the terrain
        slope product, ground projected complex cross products, the compressed
        stokes matrix, pauli decompositions, multi-look cross products, and
        scene annotation files.
      </td>
      <td>[]</td>
      <td>None</td>
    </tr>
    <tr>
      <th>1</th>
      <td>SRTMGL1_COD</td>
      <td>https://stac.maap-project.org/</td>
      <td>NASA Shuttle Radar Topography Mission Global 1</td>
      <td>[[-180.0, -56.0, 180.0, 60.0]]</td>
      <td>[[2000-02-11T00:00:00Z, 2000-02-21T23:59:59.999000Z]]</td>
      <td>None</td>
      <td>
        NASA Shuttle Radar Topography Mission (SRTM) datasets result from a
        collaborative effort by the National Aeronautics and Space
        Administration (NASA) and the National Geospatial-Intelligence Agency
        (NGA - previously known as the National Imagery and Mapping Agency, or
        NIMA), as well as the participation of the German and Italian space
        agencies. The purpose of SRTM was to generate a near-global digital
        elevation model (DEM) of the Earth using radar interferometry. SRTM was
        a primary component of the payload on the Space Shuttle Endeavour during
        its STS-99 mission. Endeavour launched February 11, 2000 and ﬂew for 11
        days.
      </td>
      <td>[SRTM]</td>
      <td>None</td>
    </tr>
    <tr>
      <th>2</th>
      <td>COP-DEM</td>
      <td>https://catalogue.dataspace.copernicus.eu/stac</td>
      <td>COP-DEM</td>
      <td>[[-180.0, -90.0, 180.0, 90.0]]</td>
      <td>[[2010-12-12T00:00:00Z, None]]</td>
      <td>None</td>
      <td>
        The Copernicus DEM is a Digital Surface Model (DSM) that represents the
        surface of the Earth including buildings, infrastructure and vegetation.
        Data were acquired through the TanDEM-X mission between 2011 and 2015
        [https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model].
      </td>
      <td>[]</td>
      <td>None</td>
    </tr>
  </tbody>
</table>

```python
# search with a bounding box filter for Ecuador
# for collections with 'biomass' in the metadata
# but not collections with 'GEDI'
search_request = httpx.get(
    f"{API_URL}/search",
    params={
        "bbox": "-84.837,-5.433,-72.662,2.301",
        "q": "biomass -GEDI",
    },
    timeout=20,
)
search_request.raise_for_status()
search_results = search_request.json()
```

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right">
      <th></th>
      <th>id</th>
      <th>catalog_url</th>
      <th>title</th>
      <th>spatial_extent</th>
      <th>temporal_extent</th>
      <th>short_name</th>
      <th>description</th>
      <th>keywords</th>
      <th>hint</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>ESACCI_Biomass_L4_AGB_V4_100m</td>
      <td>https://stac.maap-project.org/</td>
      <td>ESA CCI Above-Ground Biomass Product Level 4 Version 4</td>
      <td>[[-180.0, -90.0, 180.0, 90.0]]</td>
      <td>[[2017-01-01T00:00:00Z, 2020-12-31T23:59:59.999000Z]]</td>
      <td>None</td>
      <td>
        This dataset comprises estimates of forest above-ground biomass for the
        years 2017, 2018, 2019 and 2020, version 4. They are derived from a
        combination of Earth observation data, depending on the year, from the
        Copernicus Sentinel-1 mission, Envisat’s ASAR instrument and JAXA’s
        Advanced Land Observing Satellite (ALOS-1 and ALOS-2), along with
        additional information from Earth observation sources. The data has been
        produced as part of the European Space Agency's (ESA's) Climate Change
        Initiative (CCI) programme by the Biomass CCI team.
      </td>
      <td>[ESA, CCI, Biomass]</td>
      <td>None</td>
    </tr>
  </tbody>
</table>

By default, the API will search a pre-defined list of APIs that are set at
application setup but you can provide a comma-separated list of STAC API URLs
(and/or CMR API URLs) and federated collection discovery API will search those
instead.

```python
# search with a free-text filter but specify a different
# set of STAC API URLs
stac_api_urls = [
    "https://cmr.earthdata.nasa.gov/stac/LPCLOUD",
    "https://earth-search.aws.element84.com/v1"
]
search_request = httpx.get(
    f"{API_URL}/search",
    params={
        "stac_api_urls": ",".join(stac_api_urls),
        "q": "HLS disturbance"
    },
    timeout=20,
)
search_request.raise_for_status()
search_results = search_request.json()

```

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right">
      <th></th>
      <th>id</th>
      <th>catalog_url</th>
      <th>title</th>
      <th>spatial_extent</th>
      <th>temporal_extent</th>
      <th>short_name</th>
      <th>description</th>
      <th>keywords</th>
      <th>hint</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>OPERA_L3_DIST-ALERT-HLS_V1_1</td>
      <td>https://cmr.earthdata.nasa.gov/stac/LPCLOUD</td>
      <td>
        OPERA Land Surface Disturbance Alert from Harmonized Landsat Sentinel-2
        product (Version 1)
      </td>
      <td>[[-180, -90, 180, 90]]</td>
      <td>[[2022-01-01T00:00:00Z, None]]</td>
      <td>None</td>
      <td>
        The Observational Products for End-Users from Remote Sensing Analysis
        (OPERA) Land Surface Disturbance Alert from Harmonized Landsat
        Sentinel-2 (HLS) product Version 1 maps vegetation disturbance alerts
        that are derived from data collected by Landsat 8 and Landsat 9
        Operational Land Imager (OLI) and Sentinel-2A and Sentinel-2B
        Multi-Spectral Instrument (MSI). A vegetation disturbance alert is
        detected at 30 meter (m) spatial resolution when there is an indicated
        decrease in vegetation cover within an HLS pixel. The Level-3 data
        product also provides additional information about more general
        disturbance trends and auxiliary generic disturbance information as
        determined from the variations of the reflectance through the HLS
        scenes. HLS data represent the highest temporal frequency data available
        at medium spatial resolution. The combined observations will provide
        greater sensitivity to land changes, whether of large magnitude/short
        duration or small magnitude/long duration.\r\n The
        OPERA_L3_DIST-ALERT-HLS (or DIST-ALERT) data product is provided in
        Cloud Optimized GeoTIFF (COG) format, and each layer is distributed as a
        separate file. There are 19 layers contained within the DIST-ALERT
        product. The layers for both vegetation and generic disturbance include
        disturbance status, loss or anomaly, maximum loss anomaly, disturbance
        confidence layer, date of disturbance, count of observations with loss
        anomalies, days of ongoing anomalies, and day of last disturbance
        detection. Additional layers are vegetation cover percent, historical
        percent vegetation cover, and data mask. See the Product Specification
        Document for a more detailed description of the individual layers
        provided in the DIST-ALERT product.\r\n
      </td>
      <td>[]</td>
      <td>None</td>
    </tr>
    <tr>
      <th>1</th>
      <td>OPERA_L3_DIST-ANN-HLS_V1_1</td>
      <td>https://cmr.earthdata.nasa.gov/stac/LPCLOUD</td>
      <td>
        OPERA Land Surface Disturbance Annual from Harmonized Landsat Sentinel-2
        product (Version 1)
      </td>
      <td>[[-180, -90, 180, 90]]</td>
      <td>[[2022-01-01T00:00:00Z, None]]</td>
      <td>None</td>
      <td>
        The Observational Products for End-Users from Remote Sensing Analysis
        (OPERA) Land Surface Disturbance Annual from Harmonized Landsat
        Sentinel-2 (HLS) product Version 1 summarizes the DIST-ALERT data
        product into an annual vegetation disturbance data product. Vegetation
        disturbance is mapped when there is an indicated decrease in vegetation
        cover within an HLS Version 2 pixel. The product also provides auxiliary
        generic disturbance information as determined from the variations of the
        reflectance through the DIST-ALERT scenes to provide information about
        more general disturbance trends. The DIST-ANN product tracks changes at
        the annual scale, aggregating changes identified in the DIST-ALERT
        product. Only confirmed disturbances from the associated year are
        reported together with the date of initial disturbance. As confirmed
        disturbances are determined using subsequent cloud-free observations to
        determine if the loss detections persist, the required number of HLS
        scenes depends on visibility of the target. Due to this dependency,
        summarizing the DIST-ALERT in the DIST-ANN product will have some
        latency contingent on the algorithmic calibration and is detailed in the
        Algorithm Theoretical Basis Document (ATBD).\r\nThe
        OPERA_L3_DIST-ANN-HLS (or DIST-ANN) data product is provided in Cloud
        Optimized GeoTIFF (COG) format, and each layer is distributed as a
        separate COG. There are 21 layers contained within the DIST-ANN product:
        vegetation disturbance status, historical vegetation cover indicator,
        maximum vegetation cover indicator, maximum vegetation anomaly value,
        vegetation disturbance confidence layer, date of initial vegetation
        disturbance, number of detected vegetation loss anomalies, vegetation
        disturbance duration, date of last observation assessed for vegetation
        disturbance, and several generic disturbance layers. Each product layer
        is gridded to the same resolution and tiling system as HLS V2: 30 meter
        (m) and Military Grid Reference System (MGRS). See the Product
        Specification Document (PSD) for a more detailed description of the
        individual layers provided in the DIST-ANN product. \r\n
      </td>
      <td>[]</td>
      <td>None</td>
    </tr>
  </tbody>
</table>

> [!TIP]
> Try it yourself by firing up the docker network and running
[example_search.ipynb](./example_search.ipynb)!
