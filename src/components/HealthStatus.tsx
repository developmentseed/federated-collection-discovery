import React from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Button,
  Badge,
  Divider,
} from "@chakra-ui/react";
import { getApiHealth, getApisLackingCapability, hasCollectionSearchSupport, hasFreeTextSupport } from "../api/search";

interface HealthResponse {
  status: string;
  lifespan: {
    status: string;
  };
  upstream_apis: Record<string, {
    healthy: boolean;
    collection_search_conformance?: string[];
  }>;
}

interface HealthStatusProps {
  stacApis?: string[];
}

const HealthStatus: React.FC<HealthStatusProps> = ({ stacApis }) => {
  const [healthData, setHealthData] = React.useState<HealthResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  React.useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await getApiHealth(stacApis);
        setHealthData(data);
      } catch (error) {
        console.error("Failed to fetch health data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [stacApis]);

  if (loading) {
    return <Spinner />;
  }

  const isHealthy = healthData?.status === "UP";
  const statusText = isHealthy ? "healthy" : "outage";
  const statusColor = isHealthy ? "green.500" : "red.500";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        colorScheme={isHealthy ? "green" : "red"}
        onClick={onOpen}
        cursor="pointer"
      >
        {statusText}
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>API Health Status</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {healthData ? (
              <>
                <Flex alignItems="center" marginBottom="16px">
                  <Box
                    width="10px"
                    height="10px"
                    bg={healthData.status === "UP" ? "green" : "red"}
                    borderRadius="50%"
                    marginRight="8px"
                  />
                  <Text fontWeight="semibold">Overall Status: {healthData.status}</Text>
                </Flex>

                <Text marginBottom="8px" fontWeight="medium">Upstream APIs:</Text>
                {Object.entries(healthData.upstream_apis).map(([url, api]) => {
                  const conformance = api.collection_search_conformance || [];
                  const hasCollectionSearch = hasCollectionSearchSupport(conformance);
                  const hasFreeText = hasFreeTextSupport(conformance);

                  return (
                    <Box key={url} marginLeft="16px" marginBottom="8px" p={2} border="1px solid" borderColor="gray.200" borderRadius="md">
                      <Flex alignItems="center" marginBottom="4px">
                        <Box
                          width="10px"
                          height="10px"
                          bg={api.healthy ? "green" : "red"}
                          borderRadius="50%"
                          marginRight="8px"
                        />
                        <Text fontSize="sm" fontWeight="semibold">{url}</Text>
                      </Flex>

                      <Flex gap={2} marginLeft="18px" flexWrap="wrap">
                        <Badge colorScheme={hasCollectionSearch ? "green" : "red"} size="sm">
                          {hasCollectionSearch ? "Collection Search ✓" : "No Collection Search"}
                        </Badge>
                        <Badge colorScheme={hasFreeText ? "green" : "orange"} size="sm">
                          {hasFreeText ? "Free Text ✓" : "No Free Text"}
                        </Badge>
                      </Flex>

                      {conformance.length > 0 && (
                        <Text fontSize="xs" color="gray.600" marginLeft="18px" marginTop="2px">
                          Conformance: {conformance.join(", ")}
                        </Text>
                      )}
                    </Box>
                  );
                })}

                <Divider my={4} />

                {/* Summary of limitations */}
                {(() => {
                  const apisLackingCollectionSearch = getApisLackingCapability(healthData, 'collection-search');
                  const apisLackingFreeText = getApisLackingCapability(healthData, 'free-text');

                  return (
                    <>
                      {apisLackingCollectionSearch.length > 0 && (
                        <Box mb={2}>
                          <Text fontSize="sm" fontWeight="medium" color="red.600">
                            APIs lacking collection search support:
                          </Text>
                          <Text fontSize="xs" color="gray.600" marginLeft="16px">
                            {apisLackingCollectionSearch.join(", ")}
                          </Text>
                        </Box>
                      )}

                      {apisLackingFreeText.length > 0 && (
                        <Box mb={2}>
                          <Text fontSize="sm" fontWeight="medium" color="orange.600">
                            APIs lacking free-text search support:
                          </Text>
                          <Text fontSize="xs" color="gray.600" marginLeft="16px">
                            {apisLackingFreeText.join(", ")}
                          </Text>
                        </Box>
                      )}

                      {apisLackingCollectionSearch.length === 0 && apisLackingFreeText.length === 0 && (
                        <Text fontSize="sm" color="green.600" fontWeight="medium">
                          All configured APIs support collection search and free-text search! ✓
                        </Text>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <Text>No health data available.</Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default HealthStatus;
