import * as React from "react";
import {
  ChakraProvider,
  Box,
  Grid,
  GridItem,
  Heading,
  theme,
  Spinner,
  VStack,
  Text,
} from "@chakra-ui/react";

import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { searchApi } from "./api/search";

const HealthStatus = React.lazy(() => import("./components/HealthStatus"));
const SearchForm = React.lazy(() => import("./components/SearchForm"));
const ResultsTable = React.lazy(() => import("./components/ResultsTable"));

export const App = () => {
  const [results, setResults] = React.useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleSearch = async (formData: {
    bbox: string;
    datetime: string;
    text: string;
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

  return (
    <ChakraProvider theme={theme}>
      <Box textAlign="center" fontSize="xl" minH="100vh">
        <Grid
          h="100vh"
          templateRows="repeat(6, 1fr)"
          templateColumns="repeat(5, 1fr)"
          gap={4}
          p={3}
        >
          <GridItem
            rowSpan={1}
            colSpan={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <VStack align="center">
              <Heading>Federated Collection Discovery</Heading>
            </VStack>
          </GridItem>
          <GridItem
            rowSpan={6}
            colSpan={4}
            position="relative"
            alignItems="flex-start"
          >
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
                <Box w="100%">
                  <ResultsTable data={results} />
                </Box>
              </React.Suspense>
            )}
          </GridItem>
          <GridItem rowSpan={1} colSpan={1}>
            <VStack align="start">
              <Heading size="md">API Health:</Heading>
              <React.Suspense fallback={<Spinner size="md" />}>
                <HealthStatus />
              </React.Suspense>
            </VStack>
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <VStack align="flex-start">
              <Heading size="md">Collection search:</Heading>
              <React.Suspense fallback={<Spinner size="md" />}>
                <SearchForm onSubmit={handleSearch} />
              </React.Suspense>
              <Text>
                {results.length > 0
                  ? `Found ${results.length} results`
                  : "No results found"}
              </Text>
            </VStack>
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={1}
            display="flex"
            alignItems="flex-end"
            justifyContent="center"
          >
            <ColorModeSwitcher />
          </GridItem>
        </Grid>
      </Box>
    </ChakraProvider>
  );
};
