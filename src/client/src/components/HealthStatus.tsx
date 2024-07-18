import React from "react";
import { Box, Text, Flex, Spinner } from "@chakra-ui/react";
import { getApiHealth } from "../api/search";

const HealthStatus: React.FC = () => {
  const [healthData, setHealthData] = React.useState<Record<
    string,
    string
  > | null>(null);
  const [loading, setLoading] = React.useState(true);

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

  return (
    <Box>
      {healthData ? (
        Object.keys(healthData).map((key) => (
          <Flex key={key} alignItems="center">
            <Box
              width="10px"
              height="10px"
              bg={healthData[key] === "healthy" ? "green" : "red"}
              borderRadius="50%"
              marginRight="8px"
            />
            <Text>{key}</Text>
          </Flex>
        ))
      ) : (
        <Text>No health data available.</Text>
      )}
      <Flex marginTop="16px" alignItems="center">
        <Flex alignItems="center" marginRight="16px">
          <Box
            width="10px"
            height="10px"
            bg="green"
            borderRadius="50%"
            marginRight="8px"
          />
          <Text>healthy</Text>
        </Flex>
        <Flex alignItems="center">
          <Box
            width="10px"
            height="10px"
            bg="red"
            borderRadius="50%"
            marginRight="8px"
          />
          <Text>outage</Text>
        </Flex>
      </Flex>
    </Box>
  );
};

export default HealthStatus;
