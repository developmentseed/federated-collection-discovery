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
  Tag,
  TagLabel,
  Wrap,
} from "@chakra-ui/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  materialDark,
  materialLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { MapContainer, Rectangle } from "react-leaflet";
import CommonTileLayer from "./CommonTileLayer";

interface SpatialExtentArrayFormat {
  west: number;
  south: number;
  east: number;
  north: number;
}

const convertToSpatialExtent = (
  extent: [number, number, number, number],
): SpatialExtentArrayFormat => {
  const [west, south, east, north] = extent;
  return { west, south, east, north };
};

interface Props {
  data: Array<Record<string, any>>;
}

type ColumnBreakpoints = {
  base: string[];
  xl: string[];
};

const specificColumns: ColumnBreakpoints = {
  base: ["title", "catalog_url"],
  xl: ["title", "id", "catalog_url"],
};

const ResultsTable: React.FC<Props> = ({ data }) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode } = useColorMode();
  const [selectedRecord, setSelectedRecord] = useState<Record<
    string,
    any
  > | null>(null);
  const hintStyle = colorMode === "dark" ? materialDark : materialLight;
  const columns = useBreakpointValue(specificColumns) ?? [];

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

  const renderCell = (header: string, value: any) => {
    if (header === "temporal_range" && Array.isArray(value)) {
      const [start, end] = value;
      return `${start ? new Date(start).toLocaleDateString() : "Start Unknown"} - ${end ? new Date(end).toLocaleDateString() : "Present"}`;
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
                  <Td key={header}>{renderCell(header, row[header])}</Td>
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
      </Box>

      {selectedRecord && (
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent maxWidth="50%" width="50%">
            <ModalHeader>Collection Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {Object.entries(selectedRecord).map(([key, value]) => (
                <Box key={key} mb={2}>
                  <strong>{key}: </strong>
                  {key === "hint" ? (
                    <SyntaxHighlighter language="python" style={hintStyle}>
                      {value}
                    </SyntaxHighlighter>
                  ) : key === "spatial_extent" ? (
                    <MapDisplay
                      spatialExtent={convertToSpatialExtent(value[0])}
                    />
                  ) : key === "temporal_range" && Array.isArray(value) ? (
                    <Text>{renderCell("temporal_range", value)}</Text>
                  ) : key === "keywords" && Array.isArray(value) ? (
                    renderCell("keywords", value)
                  ) : (
                    value
                  )}
                </Box>
              ))}
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
  spatialExtent: SpatialExtentArrayFormat;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ spatialExtent }) => {
  if (
    typeof spatialExtent.south !== "number" ||
    typeof spatialExtent.west !== "number" ||
    typeof spatialExtent.north !== "number" ||
    typeof spatialExtent.east !== "number"
  ) {
    return <Text>Invalid spatial extent data</Text>;
  }

  const bounds: [number, number][] = [
    [spatialExtent.south, spatialExtent.west],
    [spatialExtent.north, spatialExtent.east],
  ];

  return (
    <Box height="300px">
      <MapContainer
        style={{ height: "100%", width: "100%" }}
        bounds={bounds}
        maxBounds={[
          [-90, -180],
          [90, 180],
        ]}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
      >
        <CommonTileLayer />
        <Rectangle bounds={bounds} pathOptions={{ color: "red" }} />
      </MapContainer>
    </Box>
  );
};

export default ResultsTable;
