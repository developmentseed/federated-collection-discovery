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
} from "@chakra-ui/react";

import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { getApiDocs, searchApi, API_URL } from "./api/search";

const HealthStatus = React.lazy(() => import("./components/HealthStatus"));
const SearchForm = React.lazy(() => import("./components/SearchForm"));
const ResultsTable = React.lazy(() => import("./components/ResultsTable"));

export const App = () => {
  const [results, setResults] = React.useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  const [docsLoading, setDocsLoading] = React.useState(true);
  const [apiDocs, setApiDocs] = React.useState<any | null>(null);

  React.useEffect(() => {
    async function fetchApiDocs() {
      try {
        setDocsLoading(true);
        const apiDocs = await getApiDocs();
        setApiDocs(apiDocs);
      } catch (err) {
        console.error("Failed to fetch API documentation", err);
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
    try {
      const data = await searchApi(formData);
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
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
                {docsLoading ? (
                  <Spinner />
                ) : (
                  <ReactMarkdown>{apiDocs.info.description}</ReactMarkdown>
                )}
                <Heading size="md" textAlign="left">
                  API Health ({API_URL})
                </Heading>
                <React.Suspense fallback={<Spinner size="md" />}>
                  <HealthStatus />
                </React.Suspense>
                <Heading size="md">Collection search:</Heading>
                <React.Suspense fallback={<Spinner size="md" />}>
                  <SearchForm onSubmit={handleSearch} apiDocs={apiDocs} />
                </React.Suspense>
                <Text>
                  {results.length > 0
                    ? `Found ${results.length} results`
                    : "No results found"}
                </Text>
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
