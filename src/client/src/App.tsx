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
  API_URL,
  FederatedSearchError,
} from "./api/search";

type ApiError = string | null;
type SearchErrors = FederatedSearchError[];

const HealthStatus = React.lazy(() => import("./components/HealthStatus"));
const SearchForm = React.lazy(() => import("./components/SearchForm"));
const ResultsTable = React.lazy(() => import("./components/ResultsTable"));

export const App = () => {
  const [results, setResults] = React.useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [apiError, setApiError] = React.useState<ApiError>(null); // For 400/500 errors
  const [searchErrors, setSearchErrors] = React.useState<SearchErrors>([]); // For search-level errors

  const [docsLoading, setDocsLoading] = React.useState(true);
  const [apiDocs, setApiDocs] = React.useState<any | null>(null);
  const [docsError, setDocsError] = React.useState<string | null>(null);

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

  const handleSearch = async (formData: {
    bbox: string;
    datetime: string;
    q: string;
  }) => {
    setLoading(true);
    setApiError(null);
    setSearchErrors([]);
    setResults([]);

    try {
      const data = await searchApi(formData);
      setResults(data.results);
      if (data.errors && data.errors.length > 0) {
        setSearchErrors(data.errors);
      }
    } catch (error) {
      console.error("Search error:", error);
      setApiError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

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

                {docsLoading ? (
                  <Spinner />
                ) : (
                  apiDocs && (
                    <ReactMarkdown>{apiDocs.info.summary}</ReactMarkdown>
                  )
                )}

                <Heading size="md" textAlign="left">
                  API Health ({API_URL})
                </Heading>
                <React.Suspense fallback={<Spinner size="md" />}>
                  <HealthStatus />
                </React.Suspense>

                <Heading size="md">Collection search:</Heading>
                {/* Show API-level errors (these are blocking errors) */}
                {apiError && (
                  <Alert status="error" mb={4}>
                    <AlertIcon />
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}

                {/* Show search-level errors (these are warnings, as we still got results) */}
                {searchErrors.length > 0 && (
                  <Alert status="warning" mb={4}>
                    <AlertIcon />
                    <AlertDescription>
                      {`${searchErrors.length} error${
                        searchErrors.length === 1 ? "" : "s"
                      } occurred during the search. The search results may be incomplete.`}
                      <Box mt={2}>
                        {searchErrors.map((error, index) => (
                          <Text key={index} fontSize="sm">
                            • {error.error_message} (from {error.catalog_url})
                          </Text>
                        ))}
                      </Box>
                    </AlertDescription>
                  </Alert>
                )}

                <React.Suspense fallback={<Spinner size="md" />}>
                  <SearchForm
                    onSubmit={handleSearch}
                    apiDocs={apiDocs}
                    apiError={apiError}
                    isLoading={loading}
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
                    <ResultsTable data={results} />
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
