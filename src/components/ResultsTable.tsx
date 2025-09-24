import React, { useState, useRef, useEffect } from "react";
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
import { OSM } from "ol/source";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { Layer } from "ol/layer";
import { defaults as defaultControls } from "ol/control";
import LayerSwitcher from "ol-layerswitcher";
import { BaseLayerOptions, GroupLayerOptions } from "ol-layerswitcher";
import STAC from "ol-stac";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { transformExtent } from "ol/proj";
import "ol/ol.css";
import "ol-layerswitcher/dist/ol-layerswitcher.css";

register(proj4);
import ReactMarkdown from "react-markdown";

interface HintFormat {
  [hint_package: string]: string;
}

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
            <Text fontWeight="semibold">
              {provider.name || "Unknown Provider"}
            </Text>
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

const ResultsTable: React.FC<Props> = ({
  data,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
}) => {
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

  const renderCell = (
    header: string,
    value: any,
    row?: Record<string, any>,
  ) => {
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
                  <Text fontWeight="bold" fontSize="lg" mb={2}>
                    Collection Information
                  </Text>

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
                    <Link
                      href={extractCatalogUrl(selectedRecord)}
                      color="blue.500"
                      isExternal
                    >
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
                            <MapDisplay stacData={selectedRecord} />
                          </Box>
                        )}
                        {selectedRecord.extent?.temporal?.interval && (
                          <Box mb={2}>
                            <Text fontWeight="semibold">Temporal:</Text>
                            <Text>
                              {formatTemporalRange(
                                selectedRecord.extent.temporal.interval,
                              )}
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
                            <Link
                              href={href}
                              color="blue.500"
                              textDecoration="underline"
                              isExternal
                            >
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
                  <Text fontWeight="semibold" mb={2}>
                    STAC Item Search Code Hints:
                  </Text>
                  <Tabs>
                    <TabList>
                      <Tab>Python</Tab>
                      <Tab>R</Tab>
                    </TabList>
                    <TabPanels>
                      <TabPanel p={0} pt={4}>
                        <SyntaxHighlighter language="python" style={hintStyle}>
                          {getPythonCodeHint(
                            extractCatalogUrl(selectedRecord),
                            selectedRecord.id || "collection-id",
                          )}
                        </SyntaxHighlighter>
                      </TabPanel>
                      <TabPanel p={0} pt={4}>
                        <SyntaxHighlighter language="r" style={hintStyle}>
                          {getRCodeHint(
                            extractCatalogUrl(selectedRecord),
                            selectedRecord.id || "collection-id",
                          )}
                        </SyntaxHighlighter>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </Box>

                {/* Collapsible Links Section */}
                {selectedRecord.links &&
                  Array.isArray(selectedRecord.links) && (
                    <Box width="100%">
                      <Button
                        variant="ghost"
                        onClick={() => setShowLinks(!showLinks)}
                        size="sm"
                      >
                        {showLinks ? "Hide" : "Show"} Links (
                        {selectedRecord.links.length})
                      </Button>
                      <Collapse in={showLinks} animateOpacity>
                        <Box
                          mt={2}
                          p={3}
                          bg={useColorModeValue("gray.50", "gray.700")}
                          borderRadius="md"
                        >
                          {selectedRecord.links.map(
                            (link: any, index: number) => (
                              <Box key={index} mb={2}>
                                <HStack spacing={2}>
                                  <Tag size="sm" colorScheme="gray">
                                    <TagLabel>{link.rel || "unknown"}</TagLabel>
                                  </Tag>
                                  {link.href && (
                                    <Link
                                      href={link.href}
                                      color="blue.500"
                                      fontSize="sm"
                                      isExternal
                                    >
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
                            ),
                          )}
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
  stacData?: any;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ stacData }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const background = new TileLayer({
        source: new OSM(),
        title: "OpenStreetMap",
        type: "base",
      } as BaseLayerOptions);

      const layers: any[] = [background];
      let stacLayer: any = null;

      if (stacData) {
        stacLayer = new STAC({
          displayWebMapLink: true,
          data: stacData,
        });
        // Configure STAC layer properties for layer switcher
        stacLayer.set("title", stacData.title || stacData.id || "STAC Layer");
        stacLayer.set("type", "overlay");
        layers.push(stacLayer);
      }

      const map = new Map({
        target: mapRef.current,
        layers,
        view: new View({
          center: [0, 0],
          zoom: 0,
        }),
        controls: defaultControls(),
      });

      // Add layer switcher
      // const layerSwitcher = new LayerSwitcher({
      //   reverse: true,
      //   groupSelectStyle: "group",
      //   startActive: true,
      //   activationMode: "click",
      //   tipLabel: "Layers",
      //   collapseTipLabel: "Collapse layer panel",
      // });
      //
      // // Position layer switcher at bottom left
      // layerSwitcher.setMap(map);
      // map.addControl(layerSwitcher);

      if (stacLayer) {
        // Try to fit extent from STAC data directly
        if (
          stacData.extent &&
          stacData.extent.spatial &&
          stacData.extent.spatial.bbox
        ) {
          const bbox = stacData.extent.spatial.bbox[0]; // Get first bbox
          if (bbox && bbox.length === 4) {
            const [minX, minY, maxX, maxY] = bbox;
            const extent4326 = [minX, minY, maxX, maxY];
            const extent3857 = transformExtent(
              extent4326,
              "EPSG:4326",
              "EPSG:3857",
            );
            console.log("Fitting to extent from STAC data (4326):", extent4326);
            console.log("Transformed extent (3857):", extent3857);
            map.getView().fit(extent3857, {
              padding: [20, 20, 20, 20],
              maxZoom: 18,
            });
          }
        }

        // Also listen for ready event as fallback
        stacLayer.on("ready", () => {
          console.log("STAC layer ready event fired");
          const extent = stacLayer.getExtent();
          console.log("STAC layer extent:", extent);
          if (extent) {
            map.getView().fit(extent, {
              padding: [20, 20, 20, 20],
              maxZoom: 18,
            });
          }
        });
      }
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.dispose();
        mapInstanceRef.current = null;
      }
    };
  }, [stacData]);

  return <Box height="300px" ref={mapRef} />;
};

export default ResultsTable;
