import { API_URL } from "../config";
import { applyFilterForApi } from "../utils/api-config";

type SearchParams = {
  bbox: string;
  datetime: string;
  q: string;
};

// Conformance analysis helper functions
export function hasCollectionSearchSupport(conformance: string[]): boolean {
  return conformance.some((cls) => cls.endsWith("collection-search"));
}

export function hasFreeTextSupport(conformance: string[]): boolean {
  return conformance.some((cls) => cls.endsWith("collection-search#free-text"));
}

export function getApisLackingCapability(
  healthData: any,
  capability: "collection-search" | "free-text",
): string[] {
  if (!healthData?.upstream_apis) return [];

  const lackingApis: string[] = [];

  Object.entries(healthData.upstream_apis).forEach(
    ([url, api]: [string, any]) => {
      const conformance = api.collection_search_conformance || [];

      const hasCapability =
        capability === "collection-search"
          ? hasCollectionSearchSupport(conformance)
          : hasFreeTextSupport(conformance);

      if (!hasCapability) {
        lackingApis.push(url);
      }
    },
  );

  return lackingApis;
}

function applyApiFilters(searchResponse: SearchResponse): SearchResponse {
  console.log("applyApiFilters called with:", searchResponse);

  if (!searchResponse.collections || searchResponse.collections.length === 0) {
    console.log("No collections found in response");
    return searchResponse;
  }

  console.log(`Processing ${searchResponse.collections.length} collections`);

  const groupedCollections = new Map<string, any[]>();

  searchResponse.collections.forEach((collection) => {
    // Extract source API from links array where rel="root"
    let sourceApi = null;
    if (collection.links && Array.isArray(collection.links)) {
      const rootLink = collection.links.find(
        (link: any) => link.rel === "root",
      );
      if (rootLink && rootLink.href) {
        sourceApi = rootLink.href;
      }
    }

    console.log(
      "Collection source API:",
      sourceApi,
      "for collection:",
      collection.id,
    );
    if (!sourceApi) return;

    if (!groupedCollections.has(sourceApi)) {
      groupedCollections.set(sourceApi, []);
    }
    groupedCollections.get(sourceApi)!.push(collection);
  });

  console.log(
    "Grouped collections by API:",
    Array.from(groupedCollections.keys()),
  );

  const filteredCollections: any[] = [];

  groupedCollections.forEach((collections, sourceApi) => {
    console.log(
      `Applying filter for ${sourceApi}: ${collections.length} collections`,
    );
    const filtered = applyFilterForApi(sourceApi, collections);
    console.log(
      `After filtering ${sourceApi}: ${filtered.length} collections remaining`,
    );
    filteredCollections.push(...filtered);
  });

  console.log(`Final filtered collections: ${filteredCollections.length}`);

  return {
    ...searchResponse,
    collections: filteredCollections,
  };
}

function buildQuery(params: SearchParams, stacApis?: string[]): string {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([_, value]) => value != null && value !== "",
    ),
  );

  const urlParams = new URLSearchParams(filteredParams);

  // Add apis parameter if provided
  if (stacApis && stacApis.length > 0) {
    stacApis.forEach((api) => urlParams.append("apis", api));
  }

  return urlParams.toString();
}

export interface FederatedSearchError {
  catalog_url: string;
  error_message: string;
}

export interface ConformanceResponse {
  conformsTo: string[];
}

type SearchResponse = {
  collections: any[];
  links: any[];
  errors?: FederatedSearchError[]; // Update this type
};

export async function searchApi(
  params: SearchParams,
  stacApis?: string[],
): Promise<SearchResponse> {
  console.log(`${params.datetime}`);
  const queryString = buildQuery(params, stacApis);
  const url = `${API_URL}/collections?${queryString}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle API-level errors (400/500)
      throw new Error(
        data?.detail ||
          `Search failed with status ${response.status}: ${response.statusText}`,
      );
    }

    return applyApiFilters(data);
  } catch (error) {
    console.error("Error encountered while performing search:", error);
    throw error;
  }
}

export async function fetchNextPage(nextUrl: string): Promise<SearchResponse> {
  try {
    const response = await fetch(nextUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          `Failed to fetch next page with status ${response.status}: ${response.statusText}`,
      );
    }

    return applyApiFilters(data);
  } catch (error) {
    console.error("Error encountered while fetching next page:", error);
    throw error;
  }
}

export async function getApiHealth(stacApis?: string[]) {
  let url = `${API_URL}/_mgmt/health`;

  // Add apis parameter if provided
  if (stacApis && stacApis.length > 0) {
    const urlParams = new URLSearchParams();
    stacApis.forEach((api) => urlParams.append("apis", api));
    url += `?${urlParams.toString()}`;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Health check failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error encountered while performing health check:", error);
    throw error;
  }
}
export async function getApiDocs() {
  const url = `${API_URL}/api`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch API docs");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch API docs", error);
    throw error;
  }
}

export async function getApiConformance(
  stacApis?: string[],
): Promise<ConformanceResponse> {
  let url = `${API_URL}/conformance`;

  // Add apis parameter if provided
  if (stacApis && stacApis.length > 0) {
    const urlParams = new URLSearchParams();
    stacApis.forEach((api) => urlParams.append("apis", api));
    url += `?${urlParams.toString()}`;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch API conformance");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
