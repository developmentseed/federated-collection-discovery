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

### Install Poetry

Ensure you have Poetry installed. If not, install it:

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

Add Poetry to your system's PATH:

- **For Unix/MacOS:**

  ```bash
  export PATH="$HOME/.local/bin:$PATH"
  ```
  
  Add the above line to your shell configuration file (`~/.bashrc`,
  `~/.bash_profile`, or `~/.zshrc`) to make it permanent.

- **For Windows:**

  Add the path to your `PATH` environment variable through the system environment
  variable settings.

### Install

Navigate to the `src/server` directory and install the dependencies (in a virtual
environment) using Poetry:

```bash
python3 -m venv env
source env/bin/activate
cd src/server
poetry install
```
