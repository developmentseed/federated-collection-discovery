type SearchParams = {
  bbox: string;
  datetime: string;
  q: string;
};

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function buildQuery(params: SearchParams): string {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([_, value]) => value != null && value !== "",
    ),
  );

  const urlParams = new URLSearchParams(filteredParams);
  return urlParams.toString();
}

export interface FederatedSearchError {
  catalog_url: string;
  error_message: string;
}

type SearchResponse = {
  collections: any[];
  links: any[];
  errors?: FederatedSearchError[]; // Update this type
};

export async function searchApi(params: SearchParams): Promise<SearchResponse> {
  console.log(`${params.datetime}`);
  const queryString = buildQuery(params);
  const url = `${API_URL}/collections?${queryString}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log(data.collections[0]);

    if (!response.ok) {
      // Handle API-level errors (400/500)
      throw new Error(
        data?.detail ||
          `Search failed with status ${response.status}: ${response.statusText}`,
      );
    }

    return data;
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

    return data;
  } catch (error) {
    console.error("Error encountered while fetching next page:", error);
    throw error;
  }
}

export async function getApiHealth() {
  const url = `${API_URL}/_mgmt/health`;

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
