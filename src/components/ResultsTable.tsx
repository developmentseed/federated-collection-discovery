import React, { useState } from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useBreakpointValue,
  useDisclosure,
  useColorMode,
  useColorModeValue,
  Text,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Tag,
  TagLabel,
  Wrap,
  Collapse,
  VStack,
  HStack,
  Divider,
  Link,
  Spinner,
} from "@chakra-ui/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  coldarkCold,
  coldarkDark,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { MapContainer, Rectangle } from "react-leaflet";
import CommonTileLayer from "./CommonTileLayer";
import ReactMarkdown from "react-markdown";

interface HintFormat {
  [hint_package: string]: string;
}

interface SpatialExtentArrayFormat {
  west: number;
  south: number;
  east: number;
  north: number;
}

const convertToSpatialExtent = (
  extents: ([number, number, number, number] | null)[],
): SpatialExtentArrayFormat[] => {
  return extents
    .filter(
      (extent): extent is [number, number, number, number] => extent !== null,
    )
    .map(([west, south, east, north]) => ({
      west,
      south,
      east,
      north,
    }));
};

const formatTemporalRange = (ranges: any[]): string => {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Open";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Invalid Date"
      : date.toISOString().split("T")[0];
  };

  const formatSingleRange = (range: any[]): string => {
    if (!Array.isArray(range) || range.length < 2) {
      return "Invalid range";
    }

    const [start, end] = range;
    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);

    if (formattedStart === "Open" && formattedEnd === "Open") {
      return "Undefined range";
    } else if (formattedStart === "Open") {
      return `- ${formattedEnd}`;
    } else if (formattedEnd === "Open") {
      return `${formattedStart} - `;
    } else {
      return `${formattedStart} - ${formattedEnd}`;
    }
  };

  if (!Array.isArray(ranges) || ranges.length === 0) {
    return "No temporal extent data";
  }

  return ranges.map(formatSingleRange).join(", ");
};


const extractCatalogUrl = (collection: Record<string, any>): string => {
  // First check if there's already a catalog_url key (backward compatibility)
  if (collection.catalog_url) {
    return collection.catalog_url;
  }

  // Extract href from links array where rel="root"
  if (collection.links && Array.isArray(collection.links)) {
    const rootLink = collection.links.find((link: any) => link.rel === "root");
    if (rootLink && rootLink.href) {
      return rootLink.href;
    }
  }

  return "N/A";
};

const formatProviders = (providers: any[]): JSX.Element => {
  if (!Array.isArray(providers) || providers.length === 0) {
    return <Text>No providers</Text>;
  }

  return (
    <VStack align="start" spacing={2}>
      {providers.map((provider: any, index: number) => (
        <Box key={index}>
          <HStack spacing={2}>
            <Text fontWeight="semibold">{provider.name || "Unknown Provider"}</Text>
            {provider.roles && Array.isArray(provider.roles) && (
              <Wrap>
                {provider.roles.map((role: string, roleIndex: number) => (
                  <Tag key={roleIndex} size="sm" colorScheme="blue">
                    <TagLabel>{role}</TagLabel>
                  </Tag>
                ))}
              </Wrap>
            )}
          </HStack>
          {provider.description && (
            <Text fontSize="sm" color="gray.600">
              {provider.description}
            </Text>
          )}
          {provider.url && (
            <Link href={provider.url} color="blue.500" fontSize="sm" isExternal>
              {provider.url}
            </Link>
          )}
        </Box>
      ))}
    </VStack>
  );
};

const getPythonCodeHint = (apiUrl: string, collectionId: string): string => {
  return `# set up an item search with pystac_client
import pystac_client

catalog = pystac_client.Client.open("${apiUrl}")

# get a sample of 10 items
search = catalog.search(
    collections="${collectionId}",
    max_items=10,
)
items = search.items()

# consider using the bbox and/or datetime filters for a more targeted search.`;
};

const getRCodeHint = (apiUrl: string, collectionId: string): string => {
  return `# set up an item search with rstac
library(rstac)

catalog <- stac("${apiUrl}")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "${collectionId}",
    limit = 10
  ) |>
  get_request()

# consider using the bbox and/or datetime args for a more targeted search`;
};

interface Props {
  data: Array<Record<string, any>>;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

type ColumnBreakpoints = {
  base: string[];
  xl: string[];
};

const specificColumns: ColumnBreakpoints = {
  base: ["title", "catalog_url"],
  xl: ["title", "id", "catalog_url"],
};

const KEY_DISPLAY_NAMES: Record<string, string> = {
  catalog_url: "API",
  temporal_extent: "temporal extent",
  spatial_extent: "spatial extent",
  hint: "item search code hint",
  extent: "extent",
  links: "links",
  stac_version: "STAC version",
  stac_extensions: "STAC extensions",
  item_assets: "item assets",
};

const formatKeyName = (key: string): string => {
  if (key in KEY_DISPLAY_NAMES) {
    return KEY_DISPLAY_NAMES[key];
  }
  return key;
};

const ResultsTable: React.FC<Props> = ({ data, hasNextPage = false, isLoadingMore = false, onLoadMore }) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode } = useColorMode();
  const [selectedRecord, setSelectedRecord] = useState<Record<
    string,
    any | HintFormat
  > | null>(null);
  const hintStyle = colorMode === "dark" ? coldarkDark : coldarkCold;
  const columns = useBreakpointValue(specificColumns) ?? [];

  // State for collapsible sections
  const [showLinks, setShowLinks] = useState(false);
  const [showJSON, setShowJSON] = useState(false);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Sort handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Sorting data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    const sortedArray = [...data].sort((a, b) => {
      if (a[sortColumn] < b[sortColumn]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortColumn] > b[sortColumn]) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sortedArray;
  }, [sortColumn, sortOrder, data]);

  const renderCell = (header: string, value: any, row?: Record<string, any>) => {
    if (header === "catalog_url" && row) {
      return extractCatalogUrl(row);
    } else if (header === "temporal_range" && Array.isArray(value)) {
      return formatTemporalRange(value);
    } else if (header === "keywords" && Array.isArray(value)) {
      return (
        <Wrap>
          {value.map((keyword, index) => (
            <Tag key={index} colorScheme="blue">
              <TagLabel>{keyword}</TagLabel>
            </Tag>
          ))}
        </Wrap>
      );
    } else if (Array.isArray(value)) {
      return value.join(", ");
    }
    return value;
  };

  const handleButtonClick = (record: Record<string, any>) => {
    setSelectedRecord(record);
    onOpen();
  };

  const PACKAGE_LANGUAGE_MAP: Record<string, string> = {
    "pystac-client": "python",
    "python-cmr": "python",
    rstac: "r",
  };
  return (
    <>
      <Box overflow="auto" maxHeight="100%">
        <Table variant="simple">
          <Thead>
            <Tr>
              {columns.map((header) => (
                <Th
                  key={header}
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg={bgColor}
                  cursor="pointer"
                  onClick={() => handleSort(header)}
                >
                  {header}{" "}
                  {sortColumn === header
                    ? sortOrder === "asc"
                      ? "🔼"
                      : "🔽"
                    : ""}
                </Th>
              ))}
              <Th position="sticky" top={0} zIndex={1} bg={bgColor}></Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedData.map((row, rowIndex) => (
              <Tr key={rowIndex}>
                {columns.map((header) => (
                  <Td key={header}>{renderCell(header, row[header], row)}</Td>
                ))}
                <Td>
                  <Button size="sm" onClick={() => handleButtonClick(row)}>
                    Details
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        {/* Load More Button */}
        {hasNextPage && (
          <Box textAlign="center" p={4}>
            <Button
              onClick={onLoadMore}
              isLoading={isLoadingMore}
              loadingText="Loading more..."
              size="md"
              colorScheme="blue"
              disabled={isLoadingMore}
            >
              {isLoadingMore ? <Spinner size="sm" /> : "Load More"}
            </Button>
          </Box>
        )}
      </Box>

      {selectedRecord && (
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent maxWidth="50%" width="50%">
            <ModalHeader>Collection Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack align="start" spacing={4}>
                {/* Core Information */}
                <Box>
                  <Text fontWeight="bold" fontSize="lg" mb={2}>Collection Information</Text>

                  {/* ID */}
                  {selectedRecord.id && (
                    <Box mb={2}>
                      <Text fontWeight="semibold">ID:</Text>
                      <Text>{selectedRecord.id}</Text>
                    </Box>
                  )}

                  {/* Source API */}
                  <Box mb={2}>
                    <Text fontWeight="semibold">API:</Text>
                    <Link href={extractCatalogUrl(selectedRecord)} color="blue.500" isExternal>
                      {extractCatalogUrl(selectedRecord)}
                    </Link>
                  </Box>

                  {/* Title */}
                  {selectedRecord.title && (
                    <Box mb={2}>
                      <Text fontWeight="semibold">Title:</Text>
                      <Text>{selectedRecord.title}</Text>
                    </Box>
                  )}

                  {/* Spatial and Temporal Extents */}
                  {selectedRecord.extent && (
                    <Box mb={2}>
                      <Text fontWeight="semibold">Extents:</Text>
                      <Box ml={2}>
                        {selectedRecord.extent?.spatial?.bbox && (
                          <Box mb={2}>
                            <Text fontWeight="semibold">Spatial:</Text>
                            <MapDisplay
                              spatialExtents={convertToSpatialExtent(selectedRecord.extent.spatial.bbox)}
                            />
                          </Box>
                        )}
                        {selectedRecord.extent?.temporal?.interval && (
                          <Box mb={2}>
                            <Text fontWeight="semibold">Temporal:</Text>
                            <Text>
                              {formatTemporalRange(selectedRecord.extent.temporal.interval)}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Providers */}
                  {selectedRecord.providers && (
                    <Box mb={2}>
                      <Text fontWeight="semibold">Providers:</Text>
                      <Box ml={2}>
                        {formatProviders(selectedRecord.providers)}
                      </Box>
                    </Box>
                  )}

                  {/* Description */}
                  {selectedRecord.description && (
                    <Box mb={2}>
                      <Text fontWeight="semibold">Description:</Text>
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <Link href={href} color="blue.500" textDecoration="underline" isExternal>
                              {children}
                            </Link>
                          ),
                        }}
                      >
                        {selectedRecord.description}
                      </ReactMarkdown>
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* STAC Item Search Code Hints */}
                <Box width="100%">
                  <Text fontWeight="semibold" mb={2}>STAC Item Search Code Hints:</Text>
                  <Tabs>
                    <TabList>
                      <Tab>Python</Tab>
                      <Tab>R</Tab>
                    </TabList>
                    <TabPanels>
                      <TabPanel p={0} pt={4}>
                        <SyntaxHighlighter
                          language="python"
                          style={hintStyle}
                        >
                          {getPythonCodeHint(extractCatalogUrl(selectedRecord), selectedRecord.id || 'collection-id')}
                        </SyntaxHighlighter>
                      </TabPanel>
                      <TabPanel p={0} pt={4}>
                        <SyntaxHighlighter
                          language="r"
                          style={hintStyle}
                        >
                          {getRCodeHint(extractCatalogUrl(selectedRecord), selectedRecord.id || 'collection-id')}
                        </SyntaxHighlighter>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </Box>

                {/* Collapsible Links Section */}
                {selectedRecord.links && Array.isArray(selectedRecord.links) && (
                  <Box width="100%">
                    <Button
                      variant="ghost"
                      onClick={() => setShowLinks(!showLinks)}
                      size="sm"
                    >
                      {showLinks ? "Hide" : "Show"} Links ({selectedRecord.links.length})
                    </Button>
                    <Collapse in={showLinks} animateOpacity>
                      <Box mt={2} p={3} bg={useColorModeValue("gray.50", "gray.700")} borderRadius="md">
                        {selectedRecord.links.map((link: any, index: number) => (
                          <Box key={index} mb={2}>
                            <HStack spacing={2}>
                              <Tag size="sm" colorScheme="gray">
                                <TagLabel>{link.rel || "unknown"}</TagLabel>
                              </Tag>
                              {link.href && (
                                <Link href={link.href} color="blue.500" fontSize="sm" isExternal>
                                  {link.href}
                                </Link>
                              )}
                            </HStack>
                            {link.title && (
                              <Text fontSize="sm" color="gray.600" ml={2}>
                                {link.title}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                )}

                {/* Collapsible JSON Section */}
                <Box width="100%">
                  <Button
                    variant="ghost"
                    onClick={() => setShowJSON(!showJSON)}
                    size="sm"
                  >
                    {showJSON ? "Hide" : "Show"} Raw JSON
                  </Button>
                  <Collapse in={showJSON} animateOpacity>
                    <Box mt={2}>
                      <SyntaxHighlighter
                        language="json"
                        style={hintStyle}
                        customStyle={{ fontSize: "12px" }}
                      >
                        {JSON.stringify(selectedRecord, null, 2)}
                      </SyntaxHighlighter>
                    </Box>
                  </Collapse>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

interface MapDisplayProps {
  spatialExtents: SpatialExtentArrayFormat[];
}

const normalizeExtent = (
  extent: SpatialExtentArrayFormat,
): SpatialExtentArrayFormat | null => {
  let { south, north, east, west } = extent;

  // Swap if south is greater than north
  if (south > north) {
    [south, north] = [north, south];
  }

  // Handle longitude wrap-around
  if (west > east) {
    // If the difference is greater than 360, it's invalid
    if (west - east >= 360) {
      return null;
    }
    // If crossing the date line, we'll use the shorter path
    if (west - east > 180) {
      west -= 360;
    }
  }

  // Handle degenerate cases (point or line)
  const EPSILON = 1e-10; // Small value to prevent degenerate rectangles
  if (Math.abs(north - south) < EPSILON) {
    north += EPSILON;
    south -= EPSILON;
  }
  if (Math.abs(east - west) < EPSILON) {
    east += EPSILON;
    west -= EPSILON;
  }

  return { south, north, east, west };
};

const MapDisplay: React.FC<MapDisplayProps> = ({ spatialExtents }) => {
  // Try to normalize all extents
  const validExtents = spatialExtents
    .map(normalizeExtent)
    .filter((extent): extent is SpatialExtentArrayFormat => extent !== null);

  if (validExtents.length === 0) {
    return <Text>Could not normalize spatial extent data</Text>;
  }

  // Log any extents that couldn't be normalized
  const invalidCount = spatialExtents.length - validExtents.length;
  if (invalidCount > 0) {
    console.warn(
      `${invalidCount} spatial extent(s) could not be normalized and were excluded.`,
    );
  }

  const allBounds: [number, number][][] = validExtents.map((extent) => [
    [extent.south, extent.west],
    [extent.north, extent.east],
  ]);

  // Calculate the overall bounds to fit all rectangles
  const overallBounds = allBounds.reduce((acc, bounds) => {
    return [
      [Math.min(acc[0][0], bounds[0][0]), Math.min(acc[0][1], bounds[0][1])],
      [Math.max(acc[1][0], bounds[1][0]), Math.max(acc[1][1], bounds[1][1])],
    ];
  }, allBounds[0]);

  // Add some padding to the bounds for better visualization
  const padBounds = (bounds: [number, number][]): [number, number][] => {
    const PAD = 0.1; // 10% padding
    const latDiff = bounds[1][0] - bounds[0][0];
    const lonDiff = bounds[1][1] - bounds[0][1];
    return [
      [
        Math.max(-90, bounds[0][0] - latDiff * PAD),
        Math.max(-180, bounds[0][1] - lonDiff * PAD),
      ],
      [
        Math.min(90, bounds[1][0] + latDiff * PAD),
        Math.min(180, bounds[1][1] + lonDiff * PAD),
      ],
    ];
  };

  const paddedBounds = padBounds(overallBounds);

  return (
    <Box height="300px">
      <MapContainer
        style={{ height: "100%", width: "100%" }}
        bounds={paddedBounds}
        maxBounds={[
          [-90, -180],
          [90, 180],
        ]}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
      >
        <CommonTileLayer />
        {allBounds.map((bounds, index) => (
          <Rectangle
            key={index}
            bounds={bounds}
            pathOptions={{ color: "purple", fillOpacity: 0.1 }}
          />
        ))}
      </MapContainer>
    </Box>
  );
};

export default ResultsTable;
