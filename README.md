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

## Development

### Installation

```bash
yarn install
```

### Testing

TODO: write tests for client app

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

### 2. Run the application

Start the API server

```bash
uv run uvicorn stac_fastapi.collection_discovery.app:app \
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
