/**
 * APPLICATION CONFIGURATION
 *
 * This file contains all configurable settings for the federated collection discovery application.
 * Modify the values below to customize your deployment.
 */

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * Backend API URL - Configure the base URL for your backend service
 * Can be overridden with VITE_API_URL environment variable
 */
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// =============================================================================
// STAC API CONFIGURATION
// =============================================================================

/**
 * Function type for filtering STAC collections on a per-API basis.
 * @param collection - The STAC collection object to evaluate
 * @returns true if the collection should be included, false to filter out
 */
export type ApiFilterFunction = (collection: any) => boolean;

/**
 * Configuration for a STAC API endpoint with optional client-side filtering.
 */
export interface ApiConfiguration {
  /** The STAC API URL */
  url: string;
  /** Optional filter function to apply to collections from this API */
  filter?: ApiFilterFunction;
  /** Human-readable description of what the filter does */
  filterDescription?: string;
}

/**
 * DEPLOYMENT CUSTOMIZATION:
 *
 * To customize filters for your deployment, replace this file before building.
 *
 * Example filter scenarios:
 *
 * 1. License-based filtering:
 *    filter: (collection) => collection.license?.toLowerCase().includes('cc')
 *
 * 2. Provider-based filtering:
 *    filter: (collection) => collection.providers?.some(p => p.name === 'NASA')
 *
 * 3. Keyword-based filtering:
 *    filter: (collection) => !collection.title?.toLowerCase().includes('experimental')
 *
 * 4. Date-based filtering:
 *    filter: (collection) => {
 *      const updated = new Date(collection.updated || '1970-01-01');
 *      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
 *      return updated >= oneYearAgo;
 *    }
 *
 * 5. Spatial resolution filtering:
 *    filter: (collection) => {
 *      const gsd = collection.summaries?.gsd?.[0];
 *      return !gsd || gsd <= 30; // Only collections with <= 30m resolution
 *    }
 */

export const DEFAULT_API_CONFIGURATIONS: ApiConfiguration[] = [
  {
    url: "https://stac.maap-project.org/",
    // Example filter: Only collections with open license
    // filter: (collection) => {
    //   const license = collection.license;
    //   return license && (license.toLowerCase().includes('cc') || license.toLowerCase().includes('open'));
    // }
  },
  {
    url: "https://staging.openveda.cloud/api/stac/",
    // Example filter: Only collections updated in the last year
    // filter: (collection) => {
    //   const updated = collection.updated || collection.datetime;
    //   if (!updated) return true;
    //   const updatedDate = new Date(updated);
    //   const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    //   return updatedDate >= oneYearAgo;
    // }
  },
  {
    url: "https://catalog.maap.eo.esa.int/catalogue/",
    filter: (collection) => {
      const providers = collection.providers;
      if (!Array.isArray(providers)) return true;

      return !providers.some(
        (provider) =>
          provider.name === "CMR" &&
          Array.isArray(provider.roles) &&
          provider.roles.includes("producer"),
      );
    },
    filterDescription: "Exclude collections from NASA CMR",
  },
  {
    url: "https://cmr.earthdata.nasa.gov/stac/ALL",
  },
];

