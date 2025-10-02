import React, { useState, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  coldarkCold,
  coldarkDark,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { OSM } from "ol/source";
import Map from "ol/Map";
import FullScreen from "ol/control/FullScreen.js";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { defaults as defaultControls } from "ol/control";
import STAC from "ol-stac";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { transformExtent } from "ol/proj";
import "ol/ol.css";
import "ol-layerswitcher/dist/ol-layerswitcher.css";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

register(proj4);

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
    return <p className="text-sm">No providers</p>;
  }

  return (
    <div className="space-y-3">
      {providers.map((provider: any, index: number) => (
        <div key={index}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">
              {provider.name || "Unknown Provider"}
            </span>
            {provider.roles && Array.isArray(provider.roles) && (
              <div className="flex flex-wrap gap-1">
                {provider.roles.map((role: string, roleIndex: number) => (
                  <Badge key={roleIndex} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {provider.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {provider.description}
            </p>
          )}
          {provider.url && (
            <a
              href={provider.url}
              className="text-sm text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {provider.url}
            </a>
          )}
        </div>
      ))}
    </div>
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

// Custom hook for dark mode detection
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

// Custom hook for responsive breakpoints
const useBreakpoint = () => {
  const [columns, setColumns] = useState<string[]>(specificColumns.base);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setColumns(specificColumns.xl);
      } else {
        setColumns(specificColumns.base);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return columns;
};

const ResultsTable: React.FC<Props> = ({
  data,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
}) => {
  const isDark = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Record<
    string,
    any | HintFormat
  > | null>(null);
  const hintStyle = isDark ? coldarkDark : coldarkCold;
  const columns = useBreakpoint();

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
        <div className="flex flex-wrap gap-1">
          {value.map((keyword, index) => (
            <Badge key={index} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
      );
    } else if (Array.isArray(value)) {
      return value.join(", ");
    }
    return value;
  };

  const handleButtonClick = (record: Record<string, any>) => {
    setSelectedRecord(record);
    setIsOpen(true);
  };

  const PACKAGE_LANGUAGE_MAP: Record<string, string> = {
    "pystac-client": "python",
    "python-cmr": "python",
    rstac: "r",
  };

  return (
    <>
      <div className="overflow-auto max-h-full">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((header) => (
                <TableHead
                  key={header}
                  className="sticky top-0 z-10 bg-background cursor-pointer"
                  onClick={() => handleSort(header)}
                >
                  <div className="flex items-center gap-1">
                    {header}
                    {sortColumn === header && (
                      <span>{sortOrder === "asc" ? "🔼" : "🔽"}</span>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="sticky top-0 z-10 bg-background"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-muted/50">
                {columns.map((header) => (
                  <TableCell key={header}>
                    {renderCell(header, row[header], row)}
                  </TableCell>
                ))}
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleButtonClick(row)}>
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Load More Button */}
        {hasNextPage && (
          <div className="text-center p-4">
            <Button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              variant="outline"
              size="sm"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>

      {selectedRecord && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-[50%] w-[50%] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Collection Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Core Information */}
              <div>
                {/* ID */}
                {selectedRecord.id && (
                  <div className="mb-3">
                    <p className="font-semibold">ID:</p>
                    <p className="text-sm">{selectedRecord.id}</p>
                  </div>
                )}

                {/* Source API */}
                <div className="mb-3">
                  <p className="font-semibold">API:</p>
                  <a
                    href={extractCatalogUrl(selectedRecord)}
                    className="text-sm text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {extractCatalogUrl(selectedRecord)}
                  </a>
                </div>

                {/* Title */}
                {selectedRecord.title && (
                  <div className="mb-3">
                    <p className="font-semibold">Title:</p>
                    <p className="text-sm">{selectedRecord.title}</p>
                  </div>
                )}

                {/* Spatial and Temporal Extents */}
                {selectedRecord.extent && (
                  <div className="mb-3">
                    <p className="font-semibold">Extents:</p>
                    <div className="ml-3 space-y-3">
                      {selectedRecord.extent?.spatial?.bbox && (
                        <div>
                          <p className="font-semibold text-sm">Spatial:</p>
                          <MapDisplay stacData={selectedRecord} />
                        </div>
                      )}
                      {selectedRecord.extent?.temporal?.interval && (
                        <div>
                          <p className="font-semibold text-sm">Temporal:</p>
                          <p className="text-sm">
                            {formatTemporalRange(
                              selectedRecord.extent.temporal.interval,
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Providers */}
                {selectedRecord.providers && (
                  <div className="mb-3">
                    <p className="font-semibold">Providers:</p>
                    <div className="ml-3">
                      {formatProviders(selectedRecord.providers)}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedRecord.description && (
                  <div className="mb-3">
                    <p className="font-semibold">Description:</p>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              className="text-primary underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {selectedRecord.description}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* STAC Item Search Code Hints */}
              <div>
                <p className="font-semibold mb-2">
                  STAC Item Search Code Hints:
                </p>
                <Tabs defaultValue="python">
                  <TabsList>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="r">R</TabsTrigger>
                  </TabsList>
                  <TabsContent value="python" className="mt-4">
                    <SyntaxHighlighter language="python" style={hintStyle}>
                      {getPythonCodeHint(
                        extractCatalogUrl(selectedRecord),
                        selectedRecord.id || "collection-id",
                      )}
                    </SyntaxHighlighter>
                  </TabsContent>
                  <TabsContent value="r" className="mt-4">
                    <SyntaxHighlighter language="r" style={hintStyle}>
                      {getRCodeHint(
                        extractCatalogUrl(selectedRecord),
                        selectedRecord.id || "collection-id",
                      )}
                    </SyntaxHighlighter>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Collapsible Links Section */}
              {selectedRecord.links && Array.isArray(selectedRecord.links) && (
                <Collapsible open={showLinks} onOpenChange={setShowLinks}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span>
                        {showLinks ? "Hide" : "Show"} Links (
                        {selectedRecord.links.length})
                      </span>
                      {showLinks ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="rounded-md bg-muted p-3 space-y-2">
                      {selectedRecord.links.map((link: any, index: number) => (
                        <div key={index}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">
                              {link.rel || "unknown"}
                            </Badge>
                            {link.href && (
                              <a
                                href={link.href}
                                className="text-sm text-primary hover:underline break-all"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {link.href}
                              </a>
                            )}
                          </div>
                          {link.title && (
                            <p className="text-sm text-muted-foreground ml-2 mt-1">
                              {link.title}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Collapsible JSON Section */}
              <Collapsible open={showJSON} onOpenChange={setShowJSON}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>{showJSON ? "Hide" : "Show"} Raw JSON</span>
                    {showJSON ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <SyntaxHighlighter
                    language="json"
                    style={hintStyle}
                    customStyle={{ fontSize: "12px" }}
                  >
                    {JSON.stringify(selectedRecord, null, 2)}
                  </SyntaxHighlighter>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
      });

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
        controls: defaultControls().extend([new FullScreen()]),
      });

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

  return <div className="h-[500px]" ref={mapRef} />;
};

export default ResultsTable;
