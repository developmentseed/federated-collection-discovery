type SearchParams = {
  bbox: string;
  datetime: string;
  q: string;
};

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function buildQuery(params: SearchParams): string {
  const urlParams = new URLSearchParams(params as any);
  return urlParams.toString();
}

export interface FederatedSearchError {
  catalog_url: string;
  error_message: string;
}

type SearchResponse = {
  results: any[];
  errors?: FederatedSearchError[]; // Update this type
};

export async function searchApi(params: SearchParams): Promise<SearchResponse> {
  console.log(`${params.datetime}`);
  const queryString = buildQuery(params);
  const url = `${API_URL}/search?${queryString}`;

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

    // Log search-level errors to console for debugging
    if (data.errors && data.errors.length > 0) {
      console.log("Search encountered the following errors:", data.errors);
    }

    return {
      results: data.results || [],
      errors: data.errors || [],
    };
  } catch (error) {
    console.error("Error encountered while performing search:", error);
    throw error;
  }
}

export async function getApiHealth() {
  const url = `${API_URL}/health`;

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
  const url = `${API_URL}/openapi.json`;

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
