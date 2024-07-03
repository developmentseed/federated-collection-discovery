# cross-catalog-search

Tool for searching for collections across multiple catalogs

# Cross-Catalog Collection Search

This project implements an application that searches through multiple geospatial metadata catalogs, such as STAC and NASA CMR, based on provided search parameters like bounding box (bbox), datetime, and free-text criteria.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup Using Virtual Environment and Poetry](#setup-using-virtual-environment-and-poetry)
- [Setup Using Docker](#setup-using-docker)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)

## Prerequisites

- Python 3.9 (or higher)
- Node.js and npm (for the React frontend)
- Docker and Docker Compose

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
  
  Add the above line to your shell configuration file (`~/.bashrc`, `~/.bash_profile`, or `~/.zshrc`) to make it permanent.

- **For Windows:**

  Add the path to your `PATH` environment variable through the system environment variable settings.

### 3. Install Dependencies

Navigate to the `src/server` directory and install the dependencies using Poetry:

```bash
cd src/server
poetry install
```

## Setup Using Docker

### 4. Build and Run the Docker Containers

Ensure Docker and Docker Compose are installed. Follow the steps below to build and start the containers:

Build and start the services:

```bash
docker compose up --build
```

Stop the services:

```bash
docker compose down
```

## Running the Application

**Local Environment (using venv and Poetry):**

Navigate to the `src/server` directory, activate your virtual environment, and run the FastAPI server using Uvicorn:

```bash
cd src/server
source venv/bin/activate  # or `venv\Scripts\activate` for Windows
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

TODO: Navigate to the `src/client` directory and start the React development server:

```bash
cd src/client
npm install  # or `yarn install`
npm start    # or `yarn start`
```

Access the application:

- Backend (FastAPI): `http://localhost:8000`
- Frontend (React): `http://localhost:3000`

**Docker:**

Once the Docker containers are running, you can access the application at the same endpoints:

- Backend (FastAPI): `http://localhost:8000`
- Frontend (React): `http://localhost:3000`

## API Endpoints

### `/search`

Initiates a search for collections that match the specified criteria.

- **Method:** `GET`
- **Parameters:**
  - `bbox` (query parameter, comma separated list of floats)
  - `datetime` (query parameter, str)
  - `text` (query parameter, str)
- **Response:**
  - A JSON object containing an array of results.

Example Request:

```bash
curl -X GET "http://localhost:8000/search?bbox=-180.0,-90.0,180.0,90.0&datetime=2020-01-01T00:00:00Z/2020-12-31T23:59:59Z&keywords=test&description=sample"
```

The arguments are meant to mirror `pystac_client.Client.search` so you can provide datetime strings in many formats.
