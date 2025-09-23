import * as React from "react";
import ReactMarkdown from "react-markdown";
import {
  ChakraProvider,
  Box,
  Flex,
  Heading,
  theme,
  Spinner,
  VStack,
  Text,
  SystemProps,
  Spacer,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";

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

  const flexDirection: SystemProps["flexDirection"] = {
    base: "column",
    xl: "row",
  };

  return (
    <ChakraProvider theme={theme}>
      <Box textAlign="left" fontSize="large" minH="100vh" p={1}>
        <Flex direction="column">
          <Flex direction={flexDirection}>
            <Box mb={{ base: 4, lg: 0 }} flex="1" maxWidth="500px" height="90%">
              <VStack align="left" spacing={4}>
                <Heading>Federated Collection Discovery</Heading>

                {docsError && (
                  <Alert status="error">
                    <AlertIcon />
                    <AlertDescription>{docsError}</AlertDescription>
                  </Alert>
                )}

                {conformanceError && (
                  <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>{conformanceError}</AlertDescription>
                  </Alert>
                )}

                {docsLoading ? (
                  <Spinner />
                ) : (
                  apiDocs && (
                    <ReactMarkdown>{apiDocs.info.summary}</ReactMarkdown>
                  )
                )}

                <Heading size="md">API Configuration:</Heading>
                <React.Suspense fallback={<Spinner size="md" />}>
                  <ApiConfigPanel
                    stacApis={stacApis}
                    onUpdate={handleUpdateStacApis}
                  />
                </React.Suspense>

                <Heading size="md">Collection search:</Heading>

                {/* Show conformance warnings only when we have conformance data showing lack of support */}
                {conformanceCapabilities &&
                  !conformanceCapabilities.hasCollectionSearch && (
                    <Alert status="warning" mb={4}>
                      <AlertIcon />
                      <AlertDescription>
                        The current set of configured upstream APIs does not
                        support collection search. Please check your STAC API
                        configuration.
                      </AlertDescription>
                    </Alert>
                  )}

                {/* Show API-level errors (these are blocking errors) */}
                {apiError && (
                  <Alert status="error" mb={4}>
                    <AlertIcon />
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}

                <React.Suspense fallback={<Spinner size="md" />}>
                  <SearchForm
                    onSubmit={handleSearch}
                    apiDocs={apiDocs}
                    apiError={apiError}
                    isLoading={loading}
                    conformanceCapabilities={conformanceCapabilities}
                    conformanceLoading={conformanceLoading}
                  />
                </React.Suspense>

                {!apiError && (
                  <Text>
                    {results.length > 0
                      ? `Found ${results.length} results`
                      : "No results found"}
                  </Text>
                )}

                <Box mt={6}></Box>
              </VStack>
            </Box>
            <Box flex="1">
              {loading ? (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                >
                  <Spinner size="xl" />
                </Box>
              ) : (
                <React.Suspense fallback={<Spinner size="xl" />}>
                  <Box w="100%" height="95vh" overflowY="auto">
                    <ResultsTable
                      data={results}
                      hasNextPage={!!nextPageUrl}
                      isLoadingMore={loadingMore}
                      onLoadMore={handleLoadMore}
                    />
                  </Box>
                </React.Suspense>
              )}
            </Box>
          </Flex>
          <Spacer />
          <ColorModeSwitcher />
        </Flex>
      </Box>
    </ChakraProvider>
  );
};
