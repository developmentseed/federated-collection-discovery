import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Input,
  IconButton,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  Badge,
  Spinner,
  useDisclosure,
  useColorMode,
} from "@chakra-ui/react";
import {
  DeleteIcon,
  AddIcon,
  RepeatIcon,
  SettingsIcon,
  InfoIcon,
} from "@chakra-ui/icons";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  coldarkCold,
  coldarkDark,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
  getApiHealth,
  getApisLackingCapability,
  hasCollectionSearchSupport,
  hasFreeTextSupport,
} from "../api/search";
import {
  getApiConfigurations,
  hasCustomFilter,
  getFilterInfo,
} from "../utils/api-config";

interface HealthResponse {
  status: string;
  lifespan: {
    status: string;
  };
  upstream_apis: Record<
    string,
    {
      healthy: boolean;
      collection_search_conformance?: string[];
    }
  >;
}

interface ApiConfigPanelProps {
  stacApis: string[];
  onUpdate: (apis: string[]) => void;
}

const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({
  stacApis,
  onUpdate,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isFilterInfoOpen,
    onOpen: onFilterInfoOpen,
    onClose: onFilterInfoClose,
  } = useDisclosure();
  const { colorMode } = useColorMode();
  const [activeTab, setActiveTab] = useState(0);
  const syntaxStyle = colorMode === "dark" ? coldarkDark : coldarkCold;
  const [selectedFilterInfo, setSelectedFilterInfo] = useState<{
    url: string;
    description: string;
    code: string;
  } | null>(null);

  // Health status state
  const [healthData, setHealthData] = React.useState<HealthResponse | null>(
    null,
  );
  const [healthLoading, setHealthLoading] = React.useState(true);

  // API management state
  const [editableApis, setEditableApis] = useState<string[]>(stacApis);
  const [newApiUrl, setNewApiUrl] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const defaultApis = React.useMemo(
    () => getApiConfigurations().map((config) => config.url),
    [],
  );

  // Fetch health data when component mounts or APIs change
  React.useEffect(() => {
    const fetchHealth = async () => {
      try {
        setHealthLoading(true);
        const data = await getApiHealth(stacApis);
        setHealthData(data);
      } catch (error) {
        console.error("Failed to fetch health data:", error);
      } finally {
        setHealthLoading(false);
      }
    };

    if (stacApis.length > 0) {
      fetchHealth();
    } else {
      setHealthLoading(false);
    }
  }, [stacApis]);

  // Reset API management state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setEditableApis([...stacApis]);
      setNewApiUrl("");
      setErrors([]);
    }
  }, [isOpen, stacApis]);

  // Calculate overall status
  const getOverallStatus = () => {
    if (healthLoading || stacApis.length === 0) {
      return { color: "gray", status: "Unknown", hasIssues: false };
    }

    if (!healthData) {
      return { color: "red", status: "Error", hasIssues: true };
    }

    const isHealthy = healthData.status === "UP";
    const apisLackingCollectionSearch = getApisLackingCapability(
      healthData,
      "collection-search",
    );
    const apisLackingFreeText = getApisLackingCapability(
      healthData,
      "free-text",
    );

    if (!isHealthy || apisLackingCollectionSearch.length > 0) {
      return { color: "red", status: "Issues", hasIssues: true };
    }

    if (apisLackingFreeText.length > 0) {
      return { color: "orange", status: "Limited", hasIssues: true };
    }

    return { color: "green", status: "Healthy", hasIssues: false };
  };

  const { color, status, hasIssues } = getOverallStatus();

  // API management functions
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddApi = () => {
    const trimmedUrl = newApiUrl.trim();
    if (!trimmedUrl) return;

    if (!validateUrl(trimmedUrl)) {
      setErrors(["Please enter a valid URL"]);
      return;
    }

    if (editableApis.includes(trimmedUrl)) {
      setErrors(["This API URL is already in the list"]);
      return;
    }

    setEditableApis([...editableApis, trimmedUrl]);
    setNewApiUrl("");
    setErrors([]);
  };

  const handleRemoveApi = (index: number) => {
    setEditableApis(editableApis.filter((_, i) => i !== index));
    setErrors([]);
  };

  const handleUpdateApi = (index: number, newUrl: string) => {
    const updatedApis = [...editableApis];
    updatedApis[index] = newUrl;
    setEditableApis(updatedApis);
  };

  const handleSave = () => {
    const validApis = editableApis.filter(
      (api) => api.trim() !== "" && validateUrl(api),
    );
    const invalidApis = editableApis.filter(
      (api) => api.trim() !== "" && !validateUrl(api),
    );

    if (invalidApis.length > 0) {
      setErrors([`Invalid URLs: ${invalidApis.join(", ")}`]);
      return;
    }

    onUpdate(validApis);
    onClose();
  };

  const handleResetToDefaults = () => {
    setEditableApis([...defaultApis]);
    setErrors([]);
  };

  const handleToggleDefaultApi = (apiUrl: string, enabled: boolean) => {
    if (enabled) {
      if (!editableApis.includes(apiUrl)) {
        setEditableApis([...editableApis, apiUrl]);
      }
    } else {
      setEditableApis(editableApis.filter((api) => api !== apiUrl));
    }
    setErrors([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleAddApi();
    }
  };

  const handleShowFilterInfo = (apiUrl: string) => {
    const filterInfo = getFilterInfo(apiUrl);
    if (filterInfo) {
      setSelectedFilterInfo({
        url: apiUrl,
        description: filterInfo.description,
        code: filterInfo.code,
      });
      onFilterInfoOpen();
    }
  };

  return (
    <>
      <Flex
        align="center"
        gap={3}
        p={3}
        borderRadius="md"
        border="1px solid"
        borderColor="gray.200"
      >
        <Box
          width="12px"
          height="12px"
          bg={`${color}.500`}
          borderRadius="50%"
        />
        <Text fontWeight="medium" flex={1}>
          {stacApis.length} API{stacApis.length !== 1 ? "s" : ""} configured •{" "}
          {status}
        </Text>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<SettingsIcon />}
          onClick={onOpen}
        >
          Settings
        </Button>
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>API Configuration & Diagnostics</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs index={activeTab} onChange={setActiveTab}>
              <TabList>
                <Tab>Configuration</Tab>
                <Tab>Diagnostics</Tab>
              </TabList>

              <TabPanels>
                {/* Configuration Tab */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="sm" color="gray.600">
                      Configure which STAC APIs to include in your search.
                      Enable/disable default APIs or add custom endpoints.
                    </Text>

                    {errors.length > 0 && (
                      <Alert status="error">
                        <AlertIcon />
                        <AlertDescription>
                          {errors.map((error, index) => (
                            <div key={index}>{error}</div>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Box>
                      <HStack justify="space-between" align="center" mb={2}>
                        <Text fontWeight="bold">Default APIs:</Text>
                        <Button
                          size="xs"
                          colorScheme="blue"
                          variant="outline"
                          leftIcon={<RepeatIcon />}
                          onClick={handleResetToDefaults}
                        >
                          Reset to Defaults
                        </Button>
                      </HStack>
                      <VStack spacing={2} align="stretch">
                        {defaultApis.map((api) => (
                          <HStack key={api}>
                            <Text fontSize="sm" flex="1" noOfLines={1}>
                              {api}
                            </Text>
                            {hasCustomFilter(api) && (
                              <>
                                <Badge colorScheme="purple" fontSize="xs">
                                  filtered
                                </Badge>
                                <IconButton
                                  aria-label="View filter details"
                                  icon={<InfoIcon />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="purple"
                                  onClick={() => handleShowFilterInfo(api)}
                                />
                              </>
                            )}
                            <Button
                              size="sm"
                              colorScheme={
                                editableApis.includes(api) ? "red" : "teal"
                              }
                              variant="outline"
                              onClick={() =>
                                handleToggleDefaultApi(
                                  api,
                                  !editableApis.includes(api),
                                )
                              }
                            >
                              {editableApis.includes(api)
                                ? "Disable"
                                : "Enable"}
                            </Button>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>

                    <Divider />

                    <Box>
                      <Text fontWeight="bold" mb={2}>
                        Custom APIs:
                      </Text>
                      <VStack spacing={2} align="stretch">
                        {editableApis
                          .filter((api) => !defaultApis.includes(api))
                          .map((api, index) => {
                            const actualIndex = editableApis.indexOf(api);
                            return (
                              <HStack key={actualIndex}>
                                <Input
                                  value={api}
                                  onChange={(e) =>
                                    handleUpdateApi(actualIndex, e.target.value)
                                  }
                                  placeholder="API URL"
                                  size="sm"
                                />
                                <IconButton
                                  aria-label="Remove API"
                                  icon={<DeleteIcon />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="outline"
                                  onClick={() => handleRemoveApi(actualIndex)}
                                />
                              </HStack>
                            );
                          })}
                        {editableApis.filter(
                          (api) => !defaultApis.includes(api),
                        ).length === 0 && (
                          <Text
                            fontSize="sm"
                            color="gray.500"
                            textAlign="center"
                            py={2}
                          >
                            No custom APIs added
                          </Text>
                        )}
                      </VStack>
                    </Box>

                    <Divider />

                    <Box>
                      <Text fontWeight="bold" mb={2}>
                        Add Custom API:
                      </Text>
                      <HStack>
                        <Input
                          placeholder="Enter STAC API URL"
                          value={newApiUrl}
                          onChange={(e) => setNewApiUrl(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                        <IconButton
                          aria-label="Add API"
                          icon={<AddIcon />}
                          colorScheme="teal"
                          onClick={handleAddApi}
                        />
                      </HStack>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Diagnostics Tab */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    {healthLoading ? (
                      <Spinner />
                    ) : healthData ? (
                      <>
                        <Flex alignItems="center">
                          <Box
                            width="10px"
                            height="10px"
                            bg={healthData.status === "UP" ? "green" : "red"}
                            borderRadius="50%"
                            marginRight="8px"
                          />
                          <Text fontWeight="semibold">
                            Overall Status: {healthData.status}
                          </Text>
                        </Flex>

                        <Text fontWeight="medium">Upstream APIs:</Text>
                        {Object.entries(healthData.upstream_apis).map(
                          ([url, api]) => {
                            const conformance =
                              api.collection_search_conformance || [];
                            const hasCollectionSearch =
                              hasCollectionSearchSupport(conformance);
                            const hasFreeText = hasFreeTextSupport(conformance);

                            return (
                              <Box
                                key={url}
                                marginLeft="16px"
                                p={2}
                                border="1px solid"
                                borderColor="gray.200"
                                borderRadius="md"
                              >
                                <Flex alignItems="center" marginBottom="4px">
                                  <Box
                                    width="10px"
                                    height="10px"
                                    bg={api.healthy ? "green" : "red"}
                                    borderRadius="50%"
                                    marginRight="8px"
                                  />
                                  <Text fontSize="sm" fontWeight="semibold">
                                    {url}
                                  </Text>
                                </Flex>

                                <Flex gap={2} marginLeft="18px" flexWrap="wrap">
                                  <Badge
                                    colorScheme={
                                      hasCollectionSearch ? "green" : "red"
                                    }
                                    size="sm"
                                  >
                                    {hasCollectionSearch
                                      ? "Collection Search ✓"
                                      : "No Collection Search"}
                                  </Badge>
                                  <Badge
                                    colorScheme={
                                      hasFreeText ? "green" : "orange"
                                    }
                                    size="sm"
                                  >
                                    {hasFreeText
                                      ? "Free Text ✓"
                                      : "No Free Text"}
                                  </Badge>
                                </Flex>

                                {conformance.length > 0 && (
                                  <Text
                                    fontSize="xs"
                                    color="gray.600"
                                    marginLeft="18px"
                                    marginTop="2px"
                                  >
                                    Conformance: {conformance.join(", ")}
                                  </Text>
                                )}
                              </Box>
                            );
                          },
                        )}

                        <Divider />

                        {/* Summary of limitations */}
                        {(() => {
                          const apisLackingCollectionSearch =
                            getApisLackingCapability(
                              healthData,
                              "collection-search",
                            );
                          const apisLackingFreeText = getApisLackingCapability(
                            healthData,
                            "free-text",
                          );

                          return (
                            <>
                              {apisLackingCollectionSearch.length > 0 && (
                                <Box>
                                  <Text
                                    fontSize="sm"
                                    fontWeight="medium"
                                    color="red.600"
                                  >
                                    APIs lacking collection search support:
                                  </Text>
                                  <Text
                                    fontSize="xs"
                                    color="gray.600"
                                    marginLeft="16px"
                                  >
                                    {apisLackingCollectionSearch.join(", ")}
                                  </Text>
                                </Box>
                              )}

                              {apisLackingFreeText.length > 0 && (
                                <Box>
                                  <Text
                                    fontSize="sm"
                                    fontWeight="medium"
                                    color="orange.600"
                                  >
                                    APIs lacking free-text search support:
                                  </Text>
                                  <Text
                                    fontSize="xs"
                                    color="gray.600"
                                    marginLeft="16px"
                                  >
                                    {apisLackingFreeText.join(", ")}
                                  </Text>
                                </Box>
                              )}

                              {apisLackingCollectionSearch.length === 0 &&
                                apisLackingFreeText.length === 0 && (
                                  <Text
                                    fontSize="sm"
                                    color="green.600"
                                    fontWeight="medium"
                                  >
                                    All configured APIs support collection
                                    search and free-text search! ✓
                                  </Text>
                                )}
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <Text>No health data available.</Text>
                    )}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            {activeTab === 0 && (
              <>
                <Button variant="ghost" mr={3} onClick={onClose}>
                  Cancel
                </Button>
                <Button colorScheme="teal" onClick={handleSave}>
                  Save Changes
                </Button>
              </>
            )}
            {activeTab === 1 && (
              <Button colorScheme="blue" onClick={onClose}>
                Close
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Filter Info Modal */}
      <Modal isOpen={isFilterInfoOpen} onClose={onFilterInfoClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Filter Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedFilterInfo && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold" mb={2}>
                    API URL:
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {selectedFilterInfo.url}
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Filter Description:
                  </Text>
                  <Text fontSize="sm">{selectedFilterInfo.description}</Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Filter Code:
                  </Text>
                  <SyntaxHighlighter
                    language="javascript"
                    style={syntaxStyle}
                    customStyle={{ fontSize: "12px", borderRadius: "6px" }}
                  >
                    {selectedFilterInfo.code}
                  </SyntaxHighlighter>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onFilterInfoClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ApiConfigPanel;

