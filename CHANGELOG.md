# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## Unreleased

- set project up so you can run everything from root directory

## 0.1.8

- add earthaccess and rstac code hints

- surface API errors and warnings in the client app

- validate bounding box input in search form of the client app

- attempt to normalize spatial extents if format is bad

## 0.1.7

- Do not suggest users run `search.item_collection()` since that might
  return a massive number of items!

## 0.1.6

### Fixed

- Display all bounding boxes from a collection's spatial extent in the
  details map [#27](https://github.com/developmentseed/federated-collection-discovery/pull/27)
- Improve format of temporal range in collection details

## 0.1.5

### Added

- Replace STAC collection filter code with `pystac_client.Client.collection_search`
  [#26](https://github.com/developmentseed/federated-collection-discovery/pull/26)
- Migrate from `poetry` to `uv` [#26](https://github.com/developmentseed/federated-collection-discovery/pull/26)
- Upgrade to httpx==0.27.2

## 0.1.4

### Fixed

- Do not try to return a `set` from a `dict` in CMR search

## 0.1.3

### Added

- Add link to GitHub source in client application

## 0.1.2

### Added

- enable `stac_api_urls` and `cmr_urls` parameters to override the default
  APIs to search
- better descriptions for API and its parameters
- enable sorting in results table in client application
- reuse openapi.json description in client application

## 0.1.1

## Added

- Make the client application responsive to window size
- Implement free-text search as defined by
[Free-Text STAC API extension](https://github.com/stac-api-extensions/freetext-search)
([#14](https://github.com/developmentseed/federated-collection-discovery/pull/1))
- Run `check_health` asynchronously

## 0.1.0

### Added

- Ability to crawl through STAC API `/collections` endpoint [#1](https://github.com/developmentseed/federated-collection-discovery/pull/1)
- Ability to search CMR API [#1](https://github.com/developmentseed/federated-collection-discovery/pull/1)
- Rudimentary client application [#3](https://github.com/developmentseed/federated-collection-discovery/pull/3)
- Concurrent API queries [#9](https://github.com/developmentseed/federated-collection-discovery/pull/9)
