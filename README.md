# Federated Collection Discovery

![federated collection discovery logo is a modified version of the proposed Fediverse logo but with a geographic theme](src/client/src/assets/logo.svg)

This project implements an application that searches through multiple
geospatial metadata catalogs, such as STAC and NASA CMR, based on provided
search parameters like bounding box (bbox), datetime, and free-text
criteria.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup Using Docker](#setup-using-docker)
- [Setup Using Virtual Environment and Poetry](#setup-using-virtual-environment-and-poetry)
- [API Endpoints](#api-endpoints)

## Prerequisites

- Python 3.9 (or higher)
- Node.js and yarn (for the React frontend)
- Docker and Docker Compose

## Setup Using Docker

Ensure Docker and Docker Compose are installed. Follow the steps below to
build and start the containers:

Build and start the services:

```bash
docker compose up --build
```

This will use the `FEDERATED_STAC_API_URLS` and
`FEDERATED_CMR_URLS` environment variables
defined in [docker-compose.yaml](./docker-compose.yaml) to search across
NASA's MAAP STAC API and VEDA STAC API, and ESA's STAC API.

Stop the services:

```bash
docker compose down
```

Once the Docker containers are running, you can access the application at the
same endpoints:

- Backend (FastAPI): `http://localhost:8000`
- Frontend (React): `http://localhost:3000`

## Setup Using Virtual Environment and Poetry

### 1. Create and Activate a Virtual Environment

It is recommended to use a virtual environment to manage your project dependencies.

Create a virtual environment:

```bash
python3 -m venv venv
```

Activate the virtual environment:

- **For Unix/MacOS:**

  ```bash
  source venv/bin/activate
  ```

- **For Windows:**

  ```bash
  venv\Scripts\activate
  ```

### 2. Install Poetry

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

### 3. Install Dependencies

Navigate to the `src/server` directory and install the dependencies using Poetry:

```bash
cd src/server
poetry install
```

### 4. Run the Application

Navigate to the `src/server` directory, activate your virtual environment, and
run the FastAPI server using Uvicorn:

```bash
cd src/server
source venv/bin/activate  # or `venv\Scripts\activate` for Windows
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Navigate to the `src/client` directory and start the React development server:

```bash
cd src/client
npm install  # or `yarn install`
npm start    # or `yarn start`
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
  - `text` (query parameter, str)
- **Response:**
  - A JSON object containing an array of results.

Example Requests:

1. Look for collections with `'hls'` in one of the text fields and data from 2020:

    ```bash
    curl -X GET \
      "http://localhost:8000/search?` \
      `bbox=-180.0,-90.0,180.0,90.0&` \
      `datetime=2020-01-01T00:00:00Z/2020-12-31T23:59:59Z&` \
      `text=hls" | jq
    ```

2. Look for collections with `'elevation'` in one of the text fields that intersects
a part of North America:

    ```bash
    curl -X GET \
      "http://localhost:8000/search?` \
      `bbox=-120,40,-110,50&` \
      `text=elevation" | jq
    ```

The arguments are consistent with the STAC API Item Search spec.
