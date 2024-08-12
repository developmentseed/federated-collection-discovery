import * as React from "react";
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
import { searchApi, API_URL } from "./api/search";

const HealthStatus = React.lazy(() => import("./components/HealthStatus"));
const SearchForm = React.lazy(() => import("./components/SearchForm"));
const ResultsTable = React.lazy(() => import("./components/ResultsTable"));

export const App = () => {
  const [results, setResults] = React.useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

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
      <Box textAlign="left" fontSize="xl" minH="100vh" p={3}>
        <Flex direction="column">
          <Flex direction={flexDirection}>
            <Box mb={{ base: 4, lg: 0 }} flex="1" maxWidth="500px">
              <VStack align="left" spacing={4}>
                <Heading>Federated Collection Discovery</Heading>
                <Text align="left">
                  Use spatial, temporal, and keyword search terms to discover
                  geospatial collections across multiple STAC APIs.
                </Text>
                <Text align="left">
                  Only performs a collection-level search, will not return
                  item-level results!
                </Text>
                <Heading size="md" textAlign="left">
                  Federated Collection Discovery API Health
                </Heading>
                <Text>API URL: {API_URL}</Text>
                <React.Suspense fallback={<Spinner size="md" />}>
                  <HealthStatus />
                </React.Suspense>
                <Heading size="md">Collection search:</Heading>
                <React.Suspense fallback={<Spinner size="md" />}>
                  <SearchForm onSubmit={handleSearch} />
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
                  <Box w="100%" height="100%">
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
