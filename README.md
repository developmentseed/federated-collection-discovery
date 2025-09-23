# Federated Collection Discovery

<img
    src="public/logo.svg"
    alt="federated collection discovery logo is a modified version of the
    proposed Fediverse logo but with a geographic theme"
    width="200"
/>

A React application for discovering and searching geospatial
collections using a [STAC FastAPI Collection Discovery API](http://developmentseed.org/stac-fastapi-collection-discovery/)
that provides federated search across multiple STAC API endpoints.
This tool allows you to configure which STAC APIs the backend searches,
view comprehensive collection metadata, and get item-search code hints.

## Features

- **Federated Search**: Configure which STAC APIs the backend searches
  across for comprehensive results
- **Interactive Collection Details**: Comprehensive modal with collection
  metadata, spatial/temporal extents, providers, and links
- **Code Generation**: Client-generated STAC item search examples in Python and
  R with dynamic values
- **Pagination Support**: Load more results with STAC-compliant pagination
  using `rel=next` links
- **API Management**: Configure, add, remove, and monitor STAC API endpoints
  with health diagnostics
- **Conformance Checking**: Automatic detection of STAC API capabilities
  (collection search, free-text search)
- **Client-Side Filtering**: Configurable per-API filtering for deployment
  customization
- **Responsive Design**: Mobile-friendly interface with sorting and filtering
  capabilities
- **Visual Mapping**: Interactive maps showing spatial extents for collections
- **Health Monitoring**: Real-time API health status with detailed conformance
  and capability information

## Table of Contents

- [Features](#features)
- [Development](#development)
- [Running with Docker](#running-with-docker)
- [Running in local environment](#running-in-local-environment)
- [Configuration](#configuration)
- [Usage](#usage)

## Development

### Installation

```bash
yarn install
```

### Testing

TODO: write tests for client app

## Running with Docker

For development and testing, a Docker setup is provided that includes both
the client application and an optional backend service for advanced use cases.

Build and start the services:

```bash
docker compose up --build
```

This will start:

- **Client application**: `http://localhost:3000`
- **Backend service** (optional): `http://localhost:8000`

Stop the services:

```bash
docker compose down
```

## Running in local environment

### Option 1: Client-Only (Recommended)

Start the React development server:

```bash
yarn install
yarn start
```

Access the application at `http://localhost:3000`

### Option 2: With Optional Backend Service

If you need the optional backend service for development:

1. Install Python dependencies:

```bash
uv sync
```

1. Start the backend service:

```bash
uv run uvicorn stac_fastapi.collection_discovery.app:app \
  --host 0.0.0.0 --port 8000 --reload
```

1. Start the React development server:

```bash
yarn start
```

Access:

- **Client application**: `http://localhost:3000`
- **Backend service**: `http://localhost:8000`

## Configuration

### API Configuration

The application can be configured to work with any STAC API endpoints:

#### Environment Variables

- `REACT_APP_API_URL`: URL to the STAC FastAPI Collection Discovery API

#### Runtime Configuration

Use the **Settings** button in the API Configuration panel to:

- **Add/Remove APIs**: Configure which STAC API endpoints the backend searches
- **Health Monitoring**: View real-time health status and conformance
  information
- **Capability Detection**: See which APIs support collection search and
  free-text search
- **Default APIs**: Reset to the APIs configured in config.ts

#### Default STAC APIs Configuration

The default STAC APIs that the application queries are configured in
`/src/config.ts` in the `DEFAULT_API_CONFIGURATIONS` array.
Edit this file to specify which STAC APIs should be available by default
and optionally add custom filter functions:

```typescript
export const DEFAULT_API_CONFIGURATIONS: ApiConfiguration[] = [
  {
    url: "https://your-stac-api.example.com/",
    // Optional: Filter collections by license
    filter: (collection) => {
      const license = collection.license;
      return license && license.toLowerCase().includes('cc');
    }
  },
];
```

Available filter examples:

- License-based filtering
- Provider-based filtering
- Date-based filtering (e.g., only recent collections)
- Spatial resolution filtering
- Keyword-based filtering

## Usage

### API Configuration & Health

1. **Configure APIs**: Click the **Settings** button in the API Configuration
   panel
2. **Health Status**: Monitor the status indicator (green=healthy, red=issues,
   orange=limited functionality)
3. **Diagnostics**: Use the Diagnostics tab to see detailed API health and
   conformance information

### Search Collections

1. **Basic Search**: Enter search parameters in the left panel:
   - **Bounding Box**: Define spatial area of interest using the map or
     coordinates
   - **Date Range**: Specify temporal coverage with date pickers
   - **Free Text**: Add keywords or collection names (if supported by
     configured APIs)

2. **View Results**: Collections appear in the right panel table with:
   - Sortable columns (title, ID, API source)
   - Click "Details" button for comprehensive collection information
   - Results from all backend-configured APIs are displayed

### Collection Details Modal

The comprehensive collection details modal provides:

- **Core Information**: Collection ID, source API, title, and description
- **Spatial/Temporal Extents**: Interactive maps showing collection coverage
  and formatted date ranges
- **Providers**: Enhanced display with roles, descriptions, and contact links
- **Code Generation**: Ready-to-use Python and R examples for STAC item
  searches with your specific search parameters
- **Collapsible Sections**:
  - **Links**: All collection relationships and associated resources
  - **Raw JSON**: Complete collection metadata for developers

### Pagination & Results

- **Progressive Loading**: Results are loaded from the Collection Discovery API
- **Load More**: When available, a "Load More" button appears to fetch
  additional results from the backend
- **Pagination Support**: The backend handles pagination across multiple STAC
  APIs seamlessly
- **Result Persistence**: New results are appended without losing your current
  position

### Advanced Features

- **Conformance Checking**: Backend performs automatic detection of STAC API capabilities
- **Error Handling**: Backend provides graceful handling of API outages with
  partial results from healthy endpoints
- **Client-Side Filtering**: Apply custom filters per API based on
  deployment-specific requirements configured in config.ts
- **Responsive Design**: Full functionality on desktop, tablet, and mobile
  devices
