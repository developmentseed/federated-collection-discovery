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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { stack, hstack, touchTarget, dialog } from "@/lib/responsive";
import { useDarkMode } from "@/utils/hooks";
import {
  getBasemapSource,
  createAttributionControl,
  getStacBoundsStyle,
} from "@/utils/map-utils";
import logoSvg from "@/assets/logo.svg";

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
    <div className={stack({ gap: "sm" })}>
      {providers.map((provider: any, index: number) => (
        <div key={index}>
          <div className={hstack({ gap: "sm" })}>
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
  hasSearched?: boolean;
  stacApis?: string[];
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

// Custom hook for responsive breakpoints
const useBreakpoint = () => {
  const [columns, setColumns] = useState<string[]>(specificColumns.base);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);

      if (width >= 1280) {
        setColumns(specificColumns.xl);
      } else {
        setColumns(specificColumns.base);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { columns, isMobile };
};

const ResultsTable: React.FC<Props> = ({
  data,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
  hasSearched = false,
  stacApis = [],
}) => {
  const isDark = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Record<
    string,
    any | HintFormat
  > | null>(null);
  const hintStyle = isDark ? coldarkDark : coldarkCold;
  const { columns, isMobile } = useBreakpoint();

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

  // Mobile card view renderer
  const MobileCardView = () => {
    if (data.length === 0) {
      if (!hasSearched) {
        return (
          <div
            className="flex flex-col items-center justify-center p-12 text-center"
            role="status"
          >
            <img
              src={logoSvg}
              className="h-16 w-16 mb-4"
              aria-hidden="true"
              alt=""
            />
            <h3 className="text-lg font-semibold mb-2">
              Search for collections
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-3">
              Search across all configured STAC APIs:
            </p>
            {stacApis.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1 max-w-md text-left">
                {stacApis.map((api, index) => (
                  <li key={index} className="break-all">
                    {api}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }
      return (
        <div
          className="flex flex-col items-center justify-center p-12 text-center"
          role="status"
        >
          <img
            src={logoSvg}
            className="h-16 w-16 mb-4"
            aria-hidden="true"
            alt=""
          />
          <h3 className="text-lg font-semibold mb-2">No collections found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Try adjusting your search criteria or check your API configuration
            to find collections.
          </p>
        </div>
      );
    }

    return (
      <div
        className={cn(stack({ gap: "md" }), "p-4")}
        role="list"
        aria-label="Search results"
      >
        {sortedData.map((row, rowIndex) => (
          <button
            key={rowIndex}
            onClick={() => handleButtonClick(row)}
            className={cn(
              "border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors duration-150 w-full text-left",
              stack({ gap: "sm" }),
              touchTarget(),
            )}
            role="listitem"
            aria-label={`View details for ${row.title || "Untitled"}`}
          >
            <div>
              <h3 className="font-medium text-base mb-1">
                {row.title || "Untitled"}
              </h3>
              {row.id && (
                <p className="text-sm text-muted-foreground font-mono">
                  {row.id}
                </p>
              )}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">API: </span>
              <span className="break-all">{extractCatalogUrl(row)}</span>
            </div>
            {row.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {row.description}
              </p>
            )}
            <div className="text-xs text-muted-foreground">
              Tap for details →
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="overflow-auto max-h-full">
        {isMobile ? (
          <MobileCardView />
        ) : data.length === 0 ? (
          !hasSearched ? (
            <div
              className="flex flex-col items-center justify-center p-16 text-center"
              role="status"
            >
              <img
                src={logoSvg}
                className="h-20 w-20 mb-6"
                aria-hidden="true"
                alt=""
              />
              <h3 className="text-xl font-semibold mb-3">
                Search for collections
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg mb-4">
                Search across all configured STAC APIs:
              </p>
              {stacApis.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-2 max-w-lg text-left">
                  {stacApis.map((api, index) => (
                    <li key={index} className="break-all font-mono">
                      {api}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center p-16 text-center"
              role="status"
            >
              <img
                src={logoSvg}
                className="h-20 w-20 mb-6"
                aria-hidden="true"
                alt=""
              />
              <h3 className="text-xl font-semibold mb-3">
                No collections found
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg mb-2">
                Try adjusting your search criteria or check your API
                configuration to find collections.
              </p>
              <p className="text-xs text-muted-foreground">
                You can modify bounding box coordinates, date ranges, or search
                terms to broaden your search.
              </p>
            </div>
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((header) => (
                  <TableHead
                    key={header}
                    className="sticky top-0 z-10 bg-background cursor-pointer py-2 px-3 font-semibold border-b border-border"
                    onClick={() => handleSort(header)}
                    role="columnheader"
                    aria-sort={
                      sortColumn === header
                        ? sortOrder === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSort(header);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {formatKeyName(header)}
                      {sortColumn === header && (
                        <span className="text-xs" aria-hidden="true">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  onClick={() => handleButtonClick(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleButtonClick(row);
                    }
                  }}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors duration-150",
                    rowIndex % 2 === 1 && "bg-muted/20",
                  )}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${row.title || "Untitled"}`}
                >
                  {columns.map((header) => (
                    <TableCell key={header} className="py-2 px-3">
                      {header === "title" ? (
                        <span className="font-medium">
                          {renderCell(header, row[header], row)}
                        </span>
                      ) : (
                        <span className="text-sm">
                          {renderCell(header, row[header], row)}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Load More Button */}
        {hasNextPage && (
          <div className="text-center p-4">
            <Button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              variant="outline"
              size="sm"
              className={cn(touchTarget(), "min-w-[120px]")}
              aria-label={
                isLoadingMore ? "Loading more results" : "Load more results"
              }
            >
              {isLoadingMore ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
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
          <DialogContent
            className={cn(dialog({ size: "lg" }), "overflow-x-hidden")}
          >
            <DialogHeader>
              <DialogTitle>Collection Details</DialogTitle>
            </DialogHeader>
            <div className={cn(stack({ gap: "md" }), "overflow-x-hidden")}>
              {/* Core Information */}
              <div className="grid grid-cols-1 gap-3">
                {/* ID */}
                {selectedRecord.id && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                      ID
                    </p>
                    <p className="text-sm font-mono break-all">
                      {selectedRecord.id}
                    </p>
                  </div>
                )}

                {/* Source API */}
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                    API
                  </p>
                  <a
                    href={extractCatalogUrl(selectedRecord)}
                    className="text-sm text-primary hover:underline break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {extractCatalogUrl(selectedRecord)}
                  </a>
                </div>

                {/* Title */}
                {selectedRecord.title && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Title
                    </p>
                    <p className="text-sm font-medium">
                      {selectedRecord.title}
                    </p>
                  </div>
                )}

                {/* Spatial and Temporal Extents */}
                {selectedRecord.extent && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Extents
                    </p>
                    <div className={stack({ gap: "sm" })}>
                      {selectedRecord.extent?.spatial?.bbox && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Spatial
                          </p>
                          <MapDisplay stacData={selectedRecord} />
                        </div>
                      )}
                      {selectedRecord.extent?.temporal?.interval && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Temporal
                          </p>
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
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Providers
                    </p>
                    <div>{formatProviders(selectedRecord.providers)}</div>
                  </div>
                )}

                {/* Description */}
                {selectedRecord.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Description
                    </p>
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
              <div className="overflow-x-hidden">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  STAC Item Search Code Hints
                </p>
                <Tabs defaultValue="python">
                  <TabsList>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="r">R</TabsTrigger>
                  </TabsList>
                  <TabsContent value="python" className="mt-4 overflow-x-auto">
                    <SyntaxHighlighter
                      language="python"
                      style={hintStyle}
                      customStyle={{
                        fontSize: "12px",
                        maxWidth: "100%",
                        overflowX: "auto",
                      }}
                    >
                      {getPythonCodeHint(
                        extractCatalogUrl(selectedRecord),
                        selectedRecord.id || "collection-id",
                      )}
                    </SyntaxHighlighter>
                  </TabsContent>
                  <TabsContent value="r" className="mt-4 overflow-x-auto">
                    <SyntaxHighlighter
                      language="r"
                      style={hintStyle}
                      customStyle={{
                        fontSize: "12px",
                        maxWidth: "100%",
                        overflowX: "auto",
                      }}
                    >
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                      aria-expanded={showLinks}
                      aria-controls="links-content"
                    >
                      <span>
                        {showLinks ? "Hide" : "Show"} Links (
                        {selectedRecord.links.length})
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          showLinks && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent
                    id="links-content"
                    className="mt-2 transition-all duration-200"
                  >
                    <div
                      className={cn(
                        "rounded-md bg-muted p-3",
                        stack({ gap: "sm" }),
                      )}
                    >
                      {selectedRecord.links.map((link: any, index: number) => (
                        <div key={index}>
                          <div className={hstack({ gap: "sm" })}>
                            <Badge variant="outline">
                              {link.rel || "unknown"}
                            </Badge>
                            {link.href && (
                              <a
                                href={link.href}
                                className="text-sm text-primary hover:underline break-all"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${link.rel || "unknown"} link: ${link.title || link.href}`}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    aria-expanded={showJSON}
                    aria-controls="json-content"
                  >
                    <span>{showJSON ? "Hide" : "Show"} Raw JSON</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        showJSON && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent
                  id="json-content"
                  className="mt-2 transition-all duration-200 overflow-x-auto"
                >
                  <SyntaxHighlighter
                    language="json"
                    style={hintStyle}
                    customStyle={{
                      fontSize: "12px",
                      maxWidth: "100%",
                      overflowX: "auto",
                    }}
                  >
                    {JSON.stringify(selectedRecord, null, 2)}
                  </SyntaxHighlighter>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setIsOpen(false)}
                className={touchTarget()}
                aria-label="Close details dialog"
              >
                Close
              </Button>
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
  const isDark = useDarkMode();

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Use dark basemap in dark mode
      const tileSource = getBasemapSource(isDark);

      const background = new TileLayer({
        source: tileSource,
      });

      const layers: any[] = [background];
      let stacLayer: any = null;

      if (stacData) {
        stacLayer = new STAC({
          displayWebMapLink: true,
          data: stacData,
          boundsStyle: getStacBoundsStyle(),
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
          showFullExtent: true,
        }),
        controls: [createAttributionControl(isDark), new FullScreen()],
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
            let [minX, minY, maxX, maxY] = bbox;

            // Validate that all values are valid numbers
            if (
              [minX, minY, maxX, maxY].every(
                (val) => typeof val === "number" && isFinite(val),
              )
            ) {
              // Fix coordinate order if min/max are swapped
              if (minX > maxX) [minX, maxX] = [maxX, minX];
              if (minY > maxY) [minY, maxY] = [maxY, minY];

              // Check that extent is not empty
              if (minX !== maxX || minY !== maxY) {
                const extent4326 = [minX, minY, maxX, maxY];
                const extent3857 = transformExtent(
                  extent4326,
                  "EPSG:4326",
                  "EPSG:3857",
                );
                console.log(
                  "Fitting to extent from STAC data (4326):",
                  extent4326,
                );
                console.log("Transformed extent (3857):", extent3857);
                map.getView().fit(extent3857, {
                  padding: [50, 50, 50, 50],
                });
              } else {
                console.warn("Empty extent in STAC data:", bbox);
              }
            } else {
              console.warn("Invalid extent values in STAC data:", bbox);
            }
          }
        }

        // Also listen for ready event as fallback
        stacLayer.on("ready", () => {
          console.log("STAC layer ready event fired");
          let extent = stacLayer.getExtent();
          console.log("STAC layer extent:", extent);

          if (
            extent &&
            Array.isArray(extent) &&
            extent.length === 4 &&
            extent.every((val) => typeof val === "number" && isFinite(val))
          ) {
            // Fix coordinate order if min/max are swapped
            let [minX, minY, maxX, maxY] = extent;
            if (minX > maxX) [minX, maxX] = [maxX, minX];
            if (minY > maxY) [minY, maxY] = [maxY, minY];

            // Check that extent is not empty
            if (minX !== maxX || minY !== maxY) {
              map.getView().fit([minX, minY, maxX, maxY], {
                padding: [20, 20, 20, 20],
                maxZoom: 18,
              });
            } else {
              console.warn("Empty extent from STAC layer:", extent);
            }
          } else {
            console.warn("Invalid extent from STAC layer:", extent);
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

  return (
    <div
      className="h-[500px]"
      ref={mapRef}
      role="img"
      aria-label={`Map showing spatial extent for ${stacData?.title || "collection"}`}
    />
  );
};

export default ResultsTable;
