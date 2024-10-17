# Federated Collection Discovery

An application for discovering geospatial data collections from multiple
STAC APIs and/or CMRs.

## Installation

The package can be installed from pypi, optionally with `uvicorn` for
serving the application locally:

for `uvicorn`:

```shell
pip install federated-collection-discovery[uvicorn]
```

If you are going to run the application in an AWS Lambda function,
install the `aws_lambda` extras in the build context:

```shell
pip install federated-collection-discovery[aws_lambda]
```

## Usage

To run the FastAPI application, set the `FEDERATED_STAC_API_URLS` environment variable
and/or the `FEDERATED_CMR_URLS` environment variable, then launch it with `uvicorn`:

```shell
MAAP_API=https://stac.maap-project.org/
VEDA_API=https://openveda.cloud/api/stac/
ESA_API=https://catalogue.dataspace.copernicus.eu/stac
FEDERATED_STAC_API_URLS=${MAAP_API},${VEDA_API},${ESA_API} \
  uvicorn federated_collection_discovery.main:app --host 0.0.0.0 --port 8000
```

## Development

### Clone the repo

```shell
git clone git@github.com:developmentseed/federated-collection-discovery.git
cd federated-collection-discovery
```

### Install `uv`

Ensure you have uv installed. If not, install it:

```bash
# install uv

# unix
curl -LsSf https://astral.sh/uv/install.sh | sh

# or on windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Install `federated_collection_discovery`

Navigate to the `src/server` directory and install the dependencies (in a virtual
environment) using Poetry:

```bash
uv sync --all-extras
```
