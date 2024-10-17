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
  extents: [number, number, number, number][],
): SpatialExtentArrayFormat[] => {
  return extents.map(([west, south, east, north]) => ({
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
                      spatialExtents={convertToSpatialExtent(value)}
                    />
                  ) : key === "temporal_extent" && Array.isArray(value) ? (
                    <Text>{formatTemporalRange(value)}</Text>
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
  spatialExtents: SpatialExtentArrayFormat[];
}

const MapDisplay: React.FC<MapDisplayProps> = ({ spatialExtents }) => {
  if (
    spatialExtents.length === 0 ||
    spatialExtents.some(
      (extent) =>
        typeof extent.south !== "number" ||
        typeof extent.west !== "number" ||
        typeof extent.north !== "number" ||
        typeof extent.east !== "number",
    )
  ) {
    return <Text>Invalid spatial extent data</Text>;
  }

  const allBounds: [number, number][][] = spatialExtents.map((extent) => [
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

  return (
    <Box height="300px">
      <MapContainer
        style={{ height: "100%", width: "100%" }}
        bounds={overallBounds}
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
            pathOptions={{ color: "red" }}
          />
        ))}
      </MapContainer>
    </Box>
  );
};

export default ResultsTable;
