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
import HealthStatus from "./components/HealthStatus";
import { Logo } from "./components/Logo";
import SearchForm from "./components/SearchForm";
import ResultsTable from "./components/ResultsTable";
import { searchApi } from "./api/search";

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
              <Logo size="300" />
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
              <Box w="100%">
                <ResultsTable data={results} />
              </Box>
            )}
          </GridItem>
          <GridItem rowSpan={1} colSpan={1}>
            <VStack align="start">
              <Heading size="md">API Health:</Heading>
              <HealthStatus />
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
              <SearchForm onSubmit={handleSearch} />
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
