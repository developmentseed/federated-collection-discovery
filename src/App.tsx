import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AlertCircle, Search } from "lucide-react";
import GitHubLogo from "./assets/github-mark.svg";
import Logo from "./assets/logo-text.svg";
import { cn } from "@/lib/utils";
import {
  stack,
  hstack,
  touchTarget,
  container,
  layout,
  sidebar,
} from "@/lib/responsive";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  const [hasSearched, setHasSearched] = React.useState<boolean>(false);
  const hasRunInitialSearch = React.useRef(false);

  const [docsLoading, setDocsLoading] = React.useState(true);
  const [apiDocs, setApiDocs] = React.useState<any | null>(null);
  const [docsError, setDocsError] = React.useState<string | null>(null);

  // STAC APIs management
  const [stacApis, setStacApis] = React.useState<string[]>([]);

  // API docs modal state
  const [isDocOpen, setIsDocOpen] = React.useState(false);

  // Mobile search sheet state - open by default on mobile only
  const [isSearchSheetOpen, setIsSearchSheetOpen] = React.useState(() => {
    // Only open by default if we're on mobile (< 1024px, where lg breakpoint hides desktop sidebar)
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });

  // Conformance management
  const [conformanceLoading, setConformanceLoading] = React.useState(true);
  const [conformanceData, setConformanceData] =
    React.useState<ConformanceResponse | null>(null);
  const [conformanceError, setConformanceError] = React.useState<string | null>(
    null
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
          "Failed to load API documentation. Please try refreshing the page."
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
          "Failed to load API conformance. Collection search features may not work as expected."
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
    setIsSearchSheetOpen(false); // Close mobile sheet after search

    try {
      const data = await searchApi(formData, stacApis);
      setResults(data.collections);
      setHasSearched(true);

      // Extract next page URL from links
      const nextLink = data.links?.find((link: any) => link.rel === "next");
      setNextPageUrl(nextLink?.href || null);
    } catch (error) {
      console.error("Search error:", error);
      setApiError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setHasSearched(true);
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
          : "An unexpected error occurred while loading more results"
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleUpdateStacApis = (newApis: string[]) => {
    setStacApis(newApis);
  };

  // Trigger search on mount if URL has search parameters
  React.useEffect(() => {
    if (hasRunInitialSearch.current || stacApis.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has("q") || params.has("bbox") || params.has("datetime")) {
      hasRunInitialSearch.current = true;
      handleSearch({
        q: params.get("q") || "",
        bbox: params.get("bbox") || "",
        datetime: params.get("datetime") || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stacApis]); // Run when stacApis are initialized

  // Calculate conformance capabilities
  const conformanceCapabilities = React.useMemo(() => {
    // Only restrict features when we have explicit conformance data showing lack of support
    if (!conformanceData || stacApis.length === 0) {
      return null; // No restrictions
    }

    return {
      hasCollectionSearch: hasCollectionSearchSupport(
        conformanceData.conformsTo
      ),
      hasFreeText: hasFreeTextSupport(conformanceData.conformsTo),
    };
  }, [conformanceData, stacApis]);

  // Render search panel content (used in both desktop and mobile views)
  const SearchPanelContent = () => (
    <div className={stack({ gap: "lg" })}>
      <div className={stack({ gap: "md" })}>
        <img
          src={Logo}
          alt="Federated Collection Discovery"
          className="h-32 w-auto"
        />

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
          <LoadingSpinner size="sm" text="Loading API documentation..." />
        ) : (
          apiDocs && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
              <ReactMarkdown>{apiDocs.info.summary}</ReactMarkdown>
            </div>
          )
        )}
      </div>

      <div className={stack({ gap: "sm" })}>
        <h2 className="text-lg font-semibold">API Configuration</h2>
        <React.Suspense fallback={<LoadingSpinner size="sm" />}>
          <ApiConfigPanel stacApis={stacApis} onUpdate={handleUpdateStacApis} />
        </React.Suspense>
      </div>

      <div className={stack({ gap: "md" })}>
        <h2 className="text-lg font-semibold">Collection Search</h2>

        {/* Show conformance warnings only when we have conformance data showing lack of support */}
        {conformanceCapabilities &&
          !conformanceCapabilities.hasCollectionSearch && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The current set of configured upstream APIs does not support
                collection search. Please check your STAC API configuration.
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

        <React.Suspense fallback={<LoadingSpinner size="sm" />}>
          <SearchForm
            onSubmit={handleSearch}
            apiError={apiError}
            isLoading={loading}
            conformanceCapabilities={conformanceCapabilities}
            conformanceLoading={conformanceLoading}
          />
        </React.Suspense>

        {!apiError && results.length > 0 && (
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Found {results.length} {results.length === 1 ? "result" : "results"}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Mobile search button - only visible on small screens */}
      <header className="lg:hidden sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-3">
          <img
            src={Logo}
            alt="Federated Collection Discovery"
            className="h-10 w-auto"
          />
          <Sheet open={isSearchSheetOpen} onOpenChange={setIsSearchSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                aria-label="Open search panel"
                aria-expanded={isSearchSheetOpen}
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[90vw] sm:w-[400px] overflow-y-auto"
              aria-label="Search and configuration panel"
            >
              <SheetHeader>
                <SheetTitle>Search & Configure</SheetTitle>
                <SheetDescription>
                  Configure APIs and search for collections
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <SearchPanelContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main
        id="main-content"
        className={cn(
          layout.flexColSm,
          "lg:flex-row gap-6 p-4 lg:p-6",
          container({ maxWidth: "custom" }),
          "mx-auto"
        )}
      >
        {/* Left sidebar - Desktop only */}
        <aside
          className={cn("hidden lg:block", sidebar({ size: "md" }))}
          aria-label="Search and configuration"
        >
          <SearchPanelContent />
        </aside>

        {/* Right panel - Results */}
        <section className="flex-1 min-w-0" aria-label="Search results">
          {loading ? (
            <div className="flex items-center justify-center h-[calc(100vh-180px)] lg:h-[calc(100vh-8rem)]">
              <LoadingSpinner size="lg" text="Searching collections..." />
            </div>
          ) : (
            <React.Suspense fallback={<LoadingSpinner size="lg" />}>
              <div className="w-full h-[calc(100vh-180px)] lg:h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border bg-card">
                <ResultsTable
                  data={results}
                  hasNextPage={!!nextPageUrl}
                  isLoadingMore={loadingMore}
                  onLoadMore={handleLoadMore}
                  hasSearched={hasSearched}
                  stacApis={stacApis}
                />
              </div>
            </React.Suspense>
          )}
        </section>
      </main>

      {/* Fixed footer with links */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t z-40">
        <nav
          className={cn(
            layout.flexColSm,
            "items-stretch sm:items-center justify-between gap-2 p-2 sm:p-3",
            container({ maxWidth: "custom" }),
            "mx-auto"
          )}
          aria-label="Footer navigation"
        >
          <div className={cn(hstack({ gap: "sm" }), "flex-wrap")}>
            <Button
              onClick={() => setIsDocOpen(true)}
              variant="outline"
              size="sm"
              className={cn(touchTarget(), "flex-1 sm:flex-initial")}
              aria-label="View API documentation"
            >
              API Documentation
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(touchTarget(), "flex-1 sm:flex-initial")}
            >
              <a
                href="https://github.com/developmentseed/federated-collection-discovery"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(hstack({ gap: "sm" }), "justify-center")}
                aria-label="View source code on GitHub"
              >
                <img
                  src={GitHubLogo}
                  className="size-4 dark:invert"
                  alt=""
                  aria-hidden="true"
                />
                <span className="sm:inline">Source Code</span>
              </a>
            </Button>
          </div>
          <div className="flex justify-center sm:justify-end">
            <ColorModeSwitcher />
          </div>
        </nav>
      </footer>

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
