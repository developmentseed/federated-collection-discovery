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
  Button
} from "@chakra-ui/react";
import { getApiHealth } from "../api/search";

interface HealthResponse {
  status: string;
  lifespan: {
    status: string;
  };
  upstream_apis: Record<string, {
    healthy: boolean;
  }>;
}

const HealthStatus: React.FC = () => {
  const [healthData, setHealthData] = React.useState<HealthResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  React.useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await getApiHealth();
        setHealthData(data);
      } catch (error) {
        console.error("Failed to fetch health data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

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
                {Object.entries(healthData.upstream_apis).map(([url, api]) => (
                  <Flex key={url} alignItems="center" marginLeft="16px" marginBottom="4px">
                    <Box
                      width="10px"
                      height="10px"
                      bg={api.healthy ? "green" : "red"}
                      borderRadius="50%"
                      marginRight="8px"
                    />
                    <Text fontSize="sm">{url}</Text>
                  </Flex>
                ))}
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
