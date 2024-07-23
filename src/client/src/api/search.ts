type SearchParams = {
  bbox: string;
  datetime: string;
  text: string;
};

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function buildQuery(params: SearchParams): string {
  const urlParams = new URLSearchParams(params as any);
  return urlParams.toString();
}

export async function searchApi(params: SearchParams) {
  console.log(`${params.datetime}`);
  const queryString = buildQuery(params);
  const url = `${API_URL}/search?hint_lang=python&${queryString}`;

  console.log("Preparing to fetch from:", url); // Log the URL being fetched

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const data = await response.json();
    return data.results;
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
