# Spec: Surface Upstream API Failures in the Frontend

## Context

The `stac-fastapi-collection-discovery` backend is gaining graceful upstream API
failure handling (see
[PR #13](https://github.com/developmentseed/stac-fastapi-collection-discovery/pull/13)).
When one or more upstream STAC APIs fail during a collection search, the
backend no longer aborts the entire request. Instead it:

- Logs the failure
- Omits the failed API's results from the response
- Returns the remaining results with HTTP 200
- Adds a `X-Failed-Upstream-Apis` response header containing a
  comma-separated list of failed API URLs

This federated collection discovery frontend currently has no knowledge of this
header. Users may see fewer results than expected with no explanation when an
upstream API is down. This spec describes the minimal frontend changes needed
to read the new header and inform users when partial failures occur.

## Goals

- **Primary:** Read the `X-Failed-Upstream-Apis` header after every search
  and "load more" request and surface the information to the user.
- **Secondary:** Display a non-blocking warning that clearly states which
  upstream APIs failed and that results may be incomplete.
- **Tertiary:** Integrate runtime failure information into the API
  Configuration indicator and Diagnostics tab so that an API which passes
  the health check but failed during search is shown with a degraded
  (yellow/amber) status rather than a purely healthy (green) one.
- **Quaternary:** Keep the existing search/pagination UX unchanged; this is
  an additive, non-breaking enhancement.

## Non-Goals

- Implement automatic retries for failed APIs (out of scope; the backend
  drops them from pagination tokens).
- Add a "strict mode" toggle to the frontend UI. The frontend will rely on
  the backend default (`strict=false`) and treat partial failures as
  informational warnings.
- Modify how the backend handles failures.
- Add per-API success/failure metrics or telemetry in the UI.

## Constraints & Assumptions

- The `fetch` API exposes response headers. `X-Failed-Upstream-Apis` will be
  accessible via `response.headers.get("X-Failed-Upstream-Apis")` provided
  the backend CORS configuration exposes the custom header.
- The header is **absent** when all APIs succeed. It is **present** when at
  least one failed.
- Failed APIs are dropped from pagination tokens. Once an API fails on page 1,
  it will not be queried on page 2. The warning should therefore appear only
  on pages where failures actually occurred.
- The existing alert/warning UI components (`Alert`, `AlertDescription` from
  `@/components/ui/alert`) are sufficient for displaying the warning.
- The application is a React SPA using `fetch`. No changes to build tooling,
  routing, or state management library are needed.

## Architecture Overview

The change touches four layers:

1. **API Layer** (`src/api/search.ts`): Update `searchApi` and `fetchNextPage`
   to return both the parsed JSON body and a list of failed upstream API URLs
   extracted from the response header.
2. **App State** (`src/App.tsx`): Track `failedApis: string[]` alongside
   existing `results`, `apiError`, and `nextPageUrl` state. Clear the list on
   every new search, append to it on "load more".
3. **Results UI** (`src/components/ResultsTable.tsx`): Render a non-blocking
   warning banner above the results when `failedApis` is non-empty.
4. **Configuration UI** (`src/components/ApiConfigPanel.tsx`): Accept
   `failedApis` as a prop and combine it with static health-check data
   to compute a combined status. An API that is `healthy: true` in the
   health endpoint but appears in `failedApis` is rendered with a
   yellow/amber degraded indicator.

```
+-------------+     +------------------+     +------------------+
| User clicks |---->| searchApi /      |---->| Fetch response   |
| "Search"    |     | fetchNextPage    |     | + check header   |
+-------------+     +------------------+     +------------------+
                                                        |
                                                        v
+----------------+  +------------------+     +------------------+
| ResultsTable   |<-| App ()           |<----| { collections,   |
| (failedApis)   |  | setFailedApis    |     |   failedApis }   |
+----------------+  +------------------+     +------------------+
       ^
       |
+----------------+  +------------------+
| ApiConfigPanel |<-| failedApis prop  |
| (combined      |  +------------------+
|  status)       |
+----------------+
```

## API / Interface Design

### Updated Search Response

```typescript
// src/api/search.ts
export interface SearchResponse {
  collections: any[];
  links: any[];
}

export interface SearchResult {
  data: SearchResponse;
  failedApis: string[];
}
```

### Updated API Functions

```typescript
export async function searchApi(
  params: SearchParams,
  stacApis?: string[]
): Promise<SearchResult>;

export async function fetchNextPage(nextUrl: string): Promise<SearchResult>;
```

### Header Parsing Helper

```typescript
function parseFailedApis(response: Response): string[] {
  const header = response.headers.get("X-Failed-Upstream-Apis");
  if (!header) return [];
  return header
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}
```

### App State Extension

```typescript
const [failedApis, setFailedApis] = React.useState<string[]>([]);
```

Passed into `ResultsTable`:

```typescript
interface Props {
  data: Array<Record<string, any>>;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  hasSearched?: boolean;
  stacApis?: string[];
  failedApis?: string[];
}
```

Passed into `ApiConfigPanel`:

```typescript
interface ApiConfigPanelProps {
  stacApis: string[];
  onUpdate: (apis: string[]) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  failedApis?: string[]; // NEW: runtime failures from search
}
```

## Data Model

No external data model changes. The only new shape is an internal TypeScript
interface:

```typescript
interface SearchResult {
  data: SearchResponse;
  failedApis: string[];
}
```

The `failedApis` field is a flat array of URL strings, deduplicated if
"load more" encounters additional failures.

## Integration Points

### 1. `src/api/search.ts`

Both `searchApi` and `fetchNextPage` currently do:

```typescript
const data = await response.json();
return applyApiFilters(data);
```

They will be updated to:

```typescript
const data = await response.json();
const failedApis = parseFailedApis(response);
return {
  data: applyApiFilters(data),
  failedApis,
};
```

**CORS Consideration:** For `fetch` to read `X-Failed-Upstream-Apis`, the
backend must include it in `Access-Control-Expose-Headers`. The backend PR
updates CORS middleware via `allow_headers=["*"]`, which in starlette usually
only affects _request_ headers. We should confirm that the backend also exposes
the header in the CORS preflight response. If not, the frontend will see the
header as `null`. A note should be added to the spec or implementation docs.

### 2. `src/App.tsx`

**State:**

```typescript
const [failedApis, setFailedApis] = React.useState<string[]>([]);
```

**`handleSearch`:**

```typescript
const { data, failedApis } = await searchApi(formData, stacApis);
setResults(data.collections);
setFailedApis(failedApis);
```

**`handleLoadMore`:**

```typescript
const { data, failedApis } = await fetchNextPage(nextPageUrl);
setResults((prev) => [...prev, ...data.collections]);
setFailedApis((prev) => [...new Set([...prev, ...failedApis])]);
```

**UI:** Insert an `Alert` variant (e.g., `variant="default"` with an
informational tone) in `SearchPanelContent` or `ResultsTable` when
`failedApis.length > 0`.

### 3. `src/components/ApiConfigPanel.tsx`

**Combined health logic:**

The existing `getOverallStatus()` function computes status from the backend
`/health` endpoint and conformance checks. It should now also accept the
`failedApis` prop and downgrade the overall status when any currently-enabled
API appears in the failure list:

- If `healthData.status === "UP"` but one or more enabled APIs are in
  `failedApis`, the sidebar indicator should show **yellow/amber** with
  status text `"Degraded"` instead of `"Healthy"`.
- If `healthData.status === "UP"` and no enabled APIs are in `failedApis`,
  the indicator remains `"Healthy"` (green).
- If `healthData.status !== "UP"` or APIs lack collection search, the
  existing red/orange logic takes precedence.

**Per-API diagnostics:**

In the Diagnostics tab, each upstream API card already shows a colored dot
based on `api.healthy`. When `failedApis.includes(url)` for a given API,
override the dot color to yellow/amber and append a tooltip or badge
explaining: "This API responded to the health check but failed during the
most recent search. Results may be incomplete."

```tsx
const isRuntimeFailed = failedApis?.includes(url) ?? false;
const dotColor =
  api.healthy && !isRuntimeFailed
    ? "rgb(34 197 94)" // green
    : isRuntimeFailed
      ? "rgb(234 179 8)" // amber-500
      : "rgb(239 68 68)"; // red
```

### 4. `src/components/ResultsTable.tsx`

Receive `failedApis` via props. Render a compact banner above the table/card
grid:

```tsx
{
  failedApis && failedApis.length > 0 && (
    <Alert className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Some upstream APIs failed and were excluded from results:
        <ul className="mt-1 list-disc list-inside text-sm">
          {failedApis.map((url) => (
            <li key={url} className="break-all">
              {url}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
```

This is additive and does not replace or affect the existing `apiError` alert
(which is for blocking 4xx/5xx errors on the discovery API itself).

## Migration Path

No migration needed. This is an additive feature. Existing behavior is
unchanged when the header is absent (all upstream APIs healthy).

## Testing Strategy

### Unit Tests

1. **Header present:** Mock `fetch` returning `200` with
   `X-Failed-Upstream-Apis: https://api1.example.com`. Assert
   `searchApi` returns `failedApis` containing the URL.
2. **Header absent:** Mock `fetch` returning `200` without the header.
   Assert `failedApis` is an empty array.
3. **Header with multiple APIs:** Mock `fetch` with a comma-separated list.
   Assert all URLs are parsed and trimmed.
4. **Error path unchanged:** Mock `fetch` returning `500`. Assert the
   function still throws (this is a backend-level failure, not an upstream
   API failure).

### Component Tests

1. **Render with failures:** Pass `failedApis` to `ResultsTable`. Assert the
   alert banner renders with the URLs.
2. **Render without failures:** Pass empty `failedApis`. Assert no banner.
3. **App integration:** In `App`, trigger `handleSearch` with a mocked
   `searchApi` that returns failures. Assert `failedApis` state is set and
   the banner appears.

### End-to-End / Manual Testing

1. Configure an upstream API that returns a 500 (or temporarily block one
   via `/etc/hosts`). Perform a search. Verify the banner appears with the
   blocked URL and that results still load from healthy APIs.
2. Click "Load More" when a failure occurred on the first page. Verify the
   banner persists (or is re-displayed if new failures occur).

## Decision Log

| Decision                                                              | Options Considered                                              | Rationale                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pass `failedApis` as prop to `ResultsTable` vs keep entirely in `App` | Keep in `App` only, render in `SearchPanelContent`              | `ResultsTable` owns the results display area; placing the warning there keeps spatial context with the data it describes.                                                                                                                                                |
| Show banner in `SearchPanelContent` vs `ResultsTable`                 | Sidebar alert, banner above table                               | `ResultsTable` is the natural place because the warning is directly about the displayed results, not the search form.                                                                                                                                                    |
| Dedupe `failedApis` on "load more"                                    | Always replace, always append                                   | Deduplicating via `new Set` is robust and handles edge cases where the same API fails across pages.                                                                                                                                                                      |
| Do not add a `strict` mode toggle                                     | Add a toggle in UI                                              | The backend default is `strict=false`, which is the desired user experience (show results + warn). Adding a toggle adds UI complexity for a niche debugging use case. Can be added later if needed.                                                                      |
| Use existing `Alert` component vs custom banner                       | Custom styled banner                                            | The existing `Alert` with default styling is sufficient and keeps the UI consistent.                                                                                                                                                                                     |
| Warn in sidebar vs results area                                       | Sidebar alert                                                   | The sidebar is already dense with configuration and search controls. The results area is where the user looks after performing a search.                                                                                                                                 |
| **Combine health-check and runtime failure status**                   | Show them separately, only show banner, ignore runtime failures | Health checks are point-in-time and can be stale. If an API passes the health check but fails during search, showing only a green dot is misleading. A combined yellow/amber state makes the discrepancy visible without requiring the user to open the diagnostics tab. |
| **Apply combined status per-API in diagnostics**                      | Show separate "health" and "search failure" columns             | A single combined indicator per API keeps the diagnostics UI compact. The yellow dot naturally signals "something is wrong with this API" and can be supplemented with a tooltip or badge explaining the nature of the degradation.                                      |

## Open Questions

1. **Banner persistence:** Should the user be able to dismiss the warning
   banner per session, or should it always be visible when failures exist?
2. **Auto-refresh health checks:** When `failedApis` changes, should the
   frontend automatically re-trigger the `/health` endpoint to get the latest
   static health status? Or should it rely solely on the existing health data
   plus runtime failures?
3. **Failure history:** Should `failedApis` be persisted across page reloads
   (e.g., in session storage) so that the degraded API indicator remains
   visible after a refresh, or should it always be cleared on every new search?
4. **Clearing `failedApis`:** Should clearing `failedApis` (e.g., via a
   "Retry" or "Reset" action) also trigger a new search to verify the API
   has recovered, or should it be purely a UI reset?

## Status

- [x] Designing
- [x] Approved — ready to plan
- [x] Implementing
- [x] Implemented — undergoing revision to combine health-check and runtime-failure signals

## References

- Backend PR:
  [developmentseed/stac-fastapi-collection-discovery#13](https://github.com/developmentseed/stac-fastapi-collection-discovery/pull/13)
- Backend spec:
  `dev-docs/specs/upstream-error-handling.md` (in backend repo)
