import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  Settings,
  Trash2,
  Plus,
  RotateCcw,
  Info,
  Loader2,
} from "lucide-react";

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

  React.useEffect(() => {
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

const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({
  stacApis,
  onUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFilterInfoOpen, setIsFilterInfoOpen] = useState(false);
  const isDark = useDarkMode();
  const [activeTab, setActiveTab] = useState("configuration");
  const syntaxStyle = isDark ? coldarkDark : coldarkCold;
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
    if (healthLoading) {
      return {
        color: "gray",
        status: "Checking",
        isLoading: true,
        hasIssues: false,
      };
    }

    if (stacApis.length === 0) {
      return {
        color: "gray",
        status: "Unknown",
        isLoading: false,
        hasIssues: false,
      };
    }

    if (!healthData) {
      return { color: "red", status: "Error", isLoading: false, hasIssues: true };
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
      return { color: "red", status: "Issues", isLoading: false, hasIssues: true };
    }

    if (apisLackingFreeText.length > 0) {
      return {
        color: "orange",
        status: "Limited",
        isLoading: false,
        hasIssues: true,
      };
    }

    return {
      color: "green",
      status: "Healthy",
      isLoading: false,
      hasIssues: false,
    };
  };

  const { color, status, isLoading, hasIssues } = getOverallStatus();

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
    setIsOpen(false);
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
      setIsFilterInfoOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-md border border-border">
        {isLoading ? (
          <Loader2 className={`h-3 w-3 animate-spin text-${color}-500`} />
        ) : (
          <div
            className={`w-3 h-3 rounded-full bg-${color}-500`}
            style={{
              backgroundColor:
                color === "green"
                  ? "rgb(34 197 94)"
                  : color === "orange"
                    ? "rgb(249 115 22)"
                    : color === "red"
                      ? "rgb(239 68 68)"
                      : "rgb(107 114 128)",
            }}
          />
        )}
        <span className="font-medium flex-1">
          {stacApis.length} API{stacApis.length !== 1 ? "s" : ""} configured •{" "}
          {status}
        </span>
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Configuration & Diagnostics</DialogTitle>
          </DialogHeader>
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
              </TabsList>

              <TabsContent value="configuration" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Configure which STAC APIs to include in your search.
                  Enable/disable default APIs or add custom endpoints.
                </p>

                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {errors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">Default APIs:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetToDefaults}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset to Defaults
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {defaultApis.map((api) => (
                      <div key={api} className="flex items-center gap-2">
                        <span className="text-sm flex-1 truncate">{api}</span>
                        {hasCustomFilter(api) && (
                          <>
                            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900">
                              filtered
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowFilterInfo(api)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleToggleDefaultApi(
                              api,
                              !editableApis.includes(api),
                            )
                          }
                        >
                          {editableApis.includes(api) ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border my-4" />

                <div>
                  <span className="font-bold mb-2 block">Custom APIs:</span>
                  <div className="space-y-2">
                    {editableApis
                      .filter((api) => !defaultApis.includes(api))
                      .map((api, index) => {
                        const actualIndex = editableApis.indexOf(api);
                        return (
                          <div key={actualIndex} className="flex items-center gap-2">
                            <Input
                              value={api}
                              onChange={(e) =>
                                handleUpdateApi(actualIndex, e.target.value)
                              }
                              placeholder="API URL"
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveApi(actualIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    {editableApis.filter((api) => !defaultApis.includes(api))
                      .length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No custom APIs added
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border my-4" />

                <div>
                  <span className="font-bold mb-2 block">Add Custom API:</span>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter STAC API URL"
                      value={newApiUrl}
                      onChange={(e) => setNewApiUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button onClick={handleAddApi}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="diagnostics" className="space-y-4 mt-4">
                {healthLoading ? (
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : healthData ? (
                  <>
                    <div className="flex items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mr-2`}
                        style={{
                          backgroundColor:
                            healthData.status === "UP"
                              ? "rgb(34 197 94)"
                              : "rgb(239 68 68)",
                        }}
                      />
                      <span className="font-semibold">
                        Overall Status: {healthData.status}
                      </span>
                    </div>

                    <p className="font-medium">Upstream APIs:</p>
                    {Object.entries(healthData.upstream_apis).map(
                      ([url, api]) => {
                        const conformance =
                          api.collection_search_conformance || [];
                        const hasCollectionSearch =
                          hasCollectionSearchSupport(conformance);
                        const hasFreeText = hasFreeTextSupport(conformance);

                        return (
                          <div
                            key={url}
                            className="ml-4 p-3 border border-border rounded-md"
                          >
                            <div className="flex items-center mb-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full mr-2"
                                style={{
                                  backgroundColor: api.healthy
                                    ? "rgb(34 197 94)"
                                    : "rgb(239 68 68)",
                                }}
                              />
                              <span className="text-sm font-semibold">
                                {url}
                              </span>
                            </div>

                            <div className="flex gap-2 ml-5 flex-wrap">
                              <Badge
                                variant={
                                  hasCollectionSearch ? "default" : "destructive"
                                }
                              >
                                {hasCollectionSearch
                                  ? "Collection Search ✓"
                                  : "No Collection Search"}
                              </Badge>
                              <Badge
                                variant={
                                  hasFreeText ? "default" : "secondary"
                                }
                                className={
                                  !hasFreeText
                                    ? "bg-orange-100 dark:bg-orange-900"
                                    : ""
                                }
                              >
                                {hasFreeText
                                  ? "Free Text ✓"
                                  : "No Free Text"}
                              </Badge>
                            </div>

                            {conformance.length > 0 && (
                              <p className="text-xs text-muted-foreground ml-5 mt-1">
                                Conformance: {conformance.join(", ")}
                              </p>
                            )}
                          </div>
                        );
                      },
                    )}

                    <div className="border-t border-border my-4" />

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
                            <div>
                              <p className="text-sm font-medium text-destructive">
                                APIs lacking collection search support:
                              </p>
                              <p className="text-xs text-muted-foreground ml-4">
                                {apisLackingCollectionSearch.join(", ")}
                              </p>
                            </div>
                          )}

                          {apisLackingFreeText.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                APIs lacking free-text search support:
                              </p>
                              <p className="text-xs text-muted-foreground ml-4">
                                {apisLackingFreeText.join(", ")}
                              </p>
                            </div>
                          )}

                          {apisLackingCollectionSearch.length === 0 &&
                            apisLackingFreeText.length === 0 && (
                              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                All configured APIs support collection search
                                and free-text search! ✓
                              </p>
                            )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <p>No health data available.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            {activeTab === "configuration" && (
              <>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </>
            )}
            {activeTab === "diagnostics" && (
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Info Modal */}
      <Dialog open={isFilterInfoOpen} onOpenChange={setIsFilterInfoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter Details</DialogTitle>
          </DialogHeader>
          {selectedFilterInfo && (
            <div className="space-y-4">
              <div>
                <p className="font-bold mb-2">API URL:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFilterInfo.url}
                </p>
              </div>

              <div>
                <p className="font-bold mb-2">Filter Description:</p>
                <p className="text-sm">{selectedFilterInfo.description}</p>
              </div>

              <div>
                <p className="font-bold mb-2">Filter Code:</p>
                <SyntaxHighlighter
                  language="javascript"
                  style={syntaxStyle}
                  customStyle={{ fontSize: "12px", borderRadius: "6px" }}
                >
                  {selectedFilterInfo.code}
                </SyntaxHighlighter>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsFilterInfoOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiConfigPanel;
