import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import GitHubLogo from "./assets/github-mark.svg";

import { ColorModeSwitcher } from "./ColorModeSwitcher";
import {
  getApiDocs,
  searchApi,
  fetchNextPage,
  getApiConformance,
  ConformanceResponse,
  hasCollectionSearchSupport,
  hasFreeTextSupport,
} from "./api/search";
import { getApiConfigurations } from "./utils/api-config";

type ApiError = string | null;

const SearchForm = React.lazy(() => import("./components/SearchForm"));
const ResultsTable = React.lazy(() => import("./components/ResultsTable"));
const ApiConfigPanel = React.lazy(() => import("./components/ApiConfigPanel"));
const ApiDocModal = React.lazy(() => import("./components/ApiDocModal"));

export const App = () => {
  const [results, setResults] = React.useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const [apiError, setApiError] = React.useState<ApiError>(null); // For 400/500 errors
  const [nextPageUrl, setNextPageUrl] = React.useState<string | null>(null);

  const [docsLoading, setDocsLoading] = React.useState(true);
  const [apiDocs, setApiDocs] = React.useState<any | null>(null);
  const [docsError, setDocsError] = React.useState<string | null>(null);

  // STAC APIs management
  const [stacApis, setStacApis] = React.useState<string[]>([]);

  // API docs modal state
  const [isDocOpen, setIsDocOpen] = React.useState(false);

  // Conformance management
  const [conformanceLoading, setConformanceLoading] = React.useState(true);
  const [conformanceData, setConformanceData] =
    React.useState<ConformanceResponse | null>(null);
  const [conformanceError, setConformanceError] = React.useState<string | null>(
    null,
  );

  // Initialize STAC APIs from config (session-based, no localStorage)
  React.useEffect(() => {
    const defaultApis = getApiConfigurations().map((config) => config.url);
    setStacApis(defaultApis);
  }, []);

  React.useEffect(() => {
    async function fetchApiDocs() {
      try {
        setDocsLoading(true);
        setDocsError(null);
        const apiDocs = await getApiDocs();
        setApiDocs(apiDocs);
      } catch (err) {
        console.error("Failed to fetch API documentation", err);
        setDocsError(
          "Failed to load API documentation. Please try refreshing the page.",
        );
      } finally {
        setDocsLoading(false);
      }
    }

    fetchApiDocs();
  }, []);

  // Fetch conformance data when STAC APIs change
  React.useEffect(() => {
    async function fetchConformanceData() {
      if (stacApis.length === 0) {
        setConformanceLoading(false);
        return;
      }

      try {
        setConformanceLoading(true);
        setConformanceError(null);
        const conformance = await getApiConformance(stacApis);
        setConformanceData(conformance);
      } catch (err) {
        setConformanceError(
          "Failed to load API conformance. Collection search features may not work as expected.",
        );
      } finally {
        setConformanceLoading(false);
      }
    }

    fetchConformanceData();
  }, [stacApis]);

  const handleSearch = async (formData: {
    bbox: string;
    datetime: string;
    q: string;
  }) => {
    setLoading(true);
    setApiError(null);
    setResults([]);

    try {
      const data = await searchApi(formData, stacApis);
      setResults(data.collections);

      // Extract next page URL from links
      const nextLink = data.links?.find((link: any) => link.rel === "next");
      setNextPageUrl(nextLink?.href || null);
    } catch (error) {
      console.error("Search error:", error);
      setApiError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageUrl || loadingMore) return;

    setLoadingMore(true);
    setApiError(null);

    try {
      const data = await fetchNextPage(nextPageUrl);

      // Append new results to existing ones
      setResults((prevResults) => [...prevResults, ...data.collections]);

      // Update next page URL for potential further pagination
      const nextLink = data.links?.find((link: any) => link.rel === "next");
      setNextPageUrl(nextLink?.href || null);
    } catch (error) {
      console.error("Load more error:", error);
      setApiError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading more results",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleUpdateStacApis = (newApis: string[]) => {
    setStacApis(newApis);
  };

  // Calculate conformance capabilities
  const conformanceCapabilities = React.useMemo(() => {
    // Only restrict features when we have explicit conformance data showing lack of support
    if (!conformanceData || stacApis.length === 0) {
      return null; // No restrictions
    }

    return {
      hasCollectionSearch: hasCollectionSearchSupport(
        conformanceData.conformsTo,
      ),
      hasFreeText: hasFreeTextSupport(conformanceData.conformsTo),
    };
  }, [conformanceData, stacApis]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[2000px] mx-auto">
        {/* Left sidebar - Search and Configuration */}
        <div className="w-full lg:w-[420px] xl:w-[480px] flex-shrink-0 space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Federated Collection Discovery
            </h1>

            {docsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{docsError}</AlertDescription>
              </Alert>
            )}

            {conformanceError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{conformanceError}</AlertDescription>
              </Alert>
            )}

            {docsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading API documentation...</span>
              </div>
            ) : (
              apiDocs && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                  <ReactMarkdown>{apiDocs.info.summary}</ReactMarkdown>
                </div>
              )
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">API Configuration</h2>
            <React.Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}>
              <ApiConfigPanel
                stacApis={stacApis}
                onUpdate={handleUpdateStacApis}
              />
            </React.Suspense>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Collection Search</h2>

            {/* Show conformance warnings only when we have conformance data showing lack of support */}
            {conformanceCapabilities &&
              !conformanceCapabilities.hasCollectionSearch && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The current set of configured upstream APIs does not
                    support collection search. Please check your STAC API
                    configuration.
                  </AlertDescription>
                </Alert>
              )}

            {/* Show API-level errors (these are blocking errors) */}
            {apiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <React.Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}>
              <SearchForm
                onSubmit={handleSearch}
                apiError={apiError}
                isLoading={loading}
                conformanceCapabilities={conformanceCapabilities}
                conformanceLoading={conformanceLoading}
              />
            </React.Suspense>

            {!apiError && results.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Found {results.length} {results.length === 1 ? "result" : "results"}
              </p>
            )}
          </div>
        </div>

        {/* Right panel - Results */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-[400px] lg:h-[calc(100vh-8rem)]">
              <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Searching collections...</p>
              </div>
            </div>
          ) : (
            <React.Suspense fallback={<Loader2 className="h-12 w-12 animate-spin" />}>
              <div className="w-full h-[600px] lg:h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border bg-card">
                <ResultsTable
                  data={results}
                  hasNextPage={!!nextPageUrl}
                  isLoadingMore={loadingMore}
                  onLoadMore={handleLoadMore}
                />
              </div>
            </React.Suspense>
          )}
        </div>
      </div>

      {/* Fixed footer with links */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-40">
        <div className="flex items-center justify-between gap-2 p-3 max-w-[2000px] mx-auto">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setIsDocOpen(true)}
              variant="outline"
              size="sm"
            >
              API Documentation
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <a
                href="https://github.com/developmentseed/federated-collection-discovery"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <img src={GitHubLogo} className="size-4 dark:invert" alt="GitHub" />
                Source Code
              </a>
            </Button>
          </div>
          <ColorModeSwitcher />
        </div>
      </div>

      {/* API Documentation Modal */}
      <React.Suspense fallback={null}>
        <ApiDocModal
          isOpen={isDocOpen}
          onClose={() => setIsDocOpen(false)}
          apiDocs={apiDocs}
        />
      </React.Suspense>
    </div>
  );
};
