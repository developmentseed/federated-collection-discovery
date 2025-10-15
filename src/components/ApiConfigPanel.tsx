import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Wrench,
  Activity,
} from "lucide-react";
import { cn } from "@/utils/utils";
import { stack, hstack, dialog } from "@/utils/responsive";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({
  stacApis,
  onUpdate,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  // Use internal state if not controlled from parent
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen =
    controlledOnOpenChange !== undefined
      ? controlledOnOpenChange
      : setInternalIsOpen;
  const [isFilterInfoOpen, setIsFilterInfoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("configuration");
  const [selectedFilterInfo, setSelectedFilterInfo] = useState<{
    url: string;
    description: string;
    code: string;
  } | null>(null);

  // Health status state
  const [healthData, setHealthData] = React.useState<HealthResponse | null>(
    null
  );
  const [healthLoading, setHealthLoading] = React.useState(true);

  // API management state
  const [newApiUrl, setNewApiUrl] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const defaultApis = React.useMemo(
    () => getApiConfigurations().map((config) => config.url),
    []
  );

  // Track all available APIs (both enabled and disabled)
  // This ensures toggled-off APIs remain visible in the list
  const [availableApis, setAvailableApis] = React.useState<string[]>([]);

  // Initialize availableApis when modal opens
  // Use a ref to track initialization to prevent re-running on stacApis changes
  const isInitialized = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !isInitialized.current) {
      // Merge default APIs with current stacApis to include any custom APIs
      const allApis = [...defaultApis];
      stacApis.forEach((api) => {
        if (!allApis.includes(api)) {
          allApis.push(api);
        }
      });
      setAvailableApis(allApis);
      isInitialized.current = true;
    } else if (!isOpen) {
      // Reset initialization flag when modal closes
      isInitialized.current = false;
    }
  }, [isOpen, defaultApis]); // Removed stacApis from dependencies to prevent re-initialization

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
      setNewApiUrl("");
      setErrors([]);
    }
  }, [isOpen]);

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
      return {
        color: "red",
        status: "Error",
        isLoading: false,
        hasIssues: true,
      };
    }

    const isHealthy = healthData.status === "UP";
    const apisLackingCollectionSearch = getApisLackingCapability(
      healthData,
      "collection-search"
    );
    const apisLackingFreeText = getApisLackingCapability(
      healthData,
      "free-text"
    );

    if (!isHealthy || apisLackingCollectionSearch.length > 0) {
      return {
        color: "red",
        status: "Issues",
        isLoading: false,
        hasIssues: true,
      };
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

  const { color, status, isLoading } = getOverallStatus();

  // API management functions
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateStacApi = async (
    url: string
  ): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      // Check if it's a valid STAC Catalog with conformsTo array
      if (data.type !== "Catalog" || !Array.isArray(data.conformsTo)) {
        return {
          valid: false,
          error:
            "URL does not appear to be a valid STAC API (missing type='Catalog' or conformsTo array)",
        };
      }

      // Check for collection-search and collection-search#free-text conformance
      const hasCollectionSearch = hasCollectionSearchSupport(data.conformsTo);
      const hasFreeText = hasFreeTextSupport(data.conformsTo);

      if (!hasCollectionSearch) {
        return {
          valid: false,
          error:
            "This STAC API does not support collection search. Required conformance classes: 'collection-search' and 'collection-search#free-text'",
        };
      }

      if (!hasFreeText) {
        return {
          valid: false,
          error:
            "This STAC API does not support free-text collection search. Required conformance class: 'collection-search#free-text'",
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Unable to connect to API: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  };

  const handleAddApi = async () => {
    const trimmedUrl = newApiUrl.trim();
    if (!trimmedUrl) return;

    if (!validateUrl(trimmedUrl)) {
      setErrors(["Please enter a valid URL"]);
      return;
    }

    if (availableApis.includes(trimmedUrl)) {
      setErrors(["This API URL is already in the list"]);
      return;
    }

    // Validate that it's a STAC API
    setIsValidating(true);
    setErrors([]);

    const validation = await validateStacApi(trimmedUrl);
    setIsValidating(false);

    if (!validation.valid) {
      setErrors([validation.error || "Invalid STAC API"]);
      return;
    }

    // Add to available APIs list
    setAvailableApis([...availableApis, trimmedUrl]);
    // Immediately update the parent component with the new API (enabled by default)
    onUpdate([...stacApis, trimmedUrl]);
    setNewApiUrl("");
    setErrors([]);
  };

  const handleResetToDefaults = () => {
    // Reset available APIs to only defaults
    setAvailableApis([...defaultApis]);
    // Immediately update the parent component with default APIs (all enabled)
    onUpdate([...defaultApis]);
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
      <div
        className={cn(
          "p-3 rounded-md border border-border",
          hstack({ gap: "sm" })
        )}
      >
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
        <DialogContent className={cn(dialog({ size: "md" }), "p-4 sm:p-6")}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              API Configuration & Diagnostics
            </DialogTitle>
          </DialogHeader>
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="configuration"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Wrench className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Configuration</span>
                  <span className="sm:hidden">Config</span>
                </TabsTrigger>
                <TabsTrigger
                  value="diagnostics"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Diagnostics</span>
                  <span className="sm:hidden">Diag</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="configuration"
                className={cn(stack({ gap: "md" }), "mt-4")}
              >
                <p className="text-sm text-muted-foreground">
                  Configure which STAC APIs to include in your search.
                  Enable/disable default APIs or add custom endpoints.
                </p>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center gap-2">
                      <CardTitle className="text-sm sm:text-base">
                        STAC APIs
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetToDefaults}
                        className="text-xs sm:text-sm shrink-0"
                      >
                        <RotateCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">
                          Reset to Defaults
                        </span>
                        <span className="sm:hidden">Reset</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className={stack({ gap: "md" })}>
                    <div className={stack({ gap: "sm" })}>
                      {/* Unified list of all APIs */}
                      {availableApis.map((api) => {
                        const isDefault = defaultApis.includes(api);
                        const isEnabled = stacApis.includes(api);
                        return (
                          <div
                            key={api}
                            className={cn(hstack({ gap: "sm" }), "py-1")}
                          >
                            <Switch
                              id={`api-${api}`}
                              checked={isEnabled}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Enable the API - add it to the enabled list
                                  onUpdate([...stacApis, api]);
                                } else {
                                  // Disable the API - remove it from the enabled list
                                  onUpdate(stacApis.filter((a) => a !== api));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`api-${api}`}
                              className="text-xs sm:text-sm flex-1 truncate cursor-pointer"
                            >
                              {api}
                            </Label>
                            {hasCustomFilter(api) && (
                              <>
                                <Badge
                                  variant="secondary"
                                  className="bg-purple-100 dark:bg-purple-900 text-xs shrink-0"
                                >
                                  filtered
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShowFilterInfo(api)}
                                  className="h-8 w-8 p-0 shrink-0"
                                >
                                  <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </>
                            )}
                            {!isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Remove custom API completely from available list
                                  setAvailableApis(
                                    availableApis.filter((a) => a !== api)
                                  );
                                  // Also remove from enabled list if it's enabled
                                  if (isEnabled) {
                                    onUpdate(stacApis.filter((a) => a !== api));
                                  }
                                }}
                                className="h-8 w-8 p-0 shrink-0"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {availableApis.length === 0 && (
                        <div className="text-center py-4 sm:py-6 text-muted-foreground">
                          <p className="text-xs sm:text-sm">
                            No APIs configured
                          </p>
                          <p className="text-xs mt-1">
                            Add a STAC API endpoint below
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-4">
                      <Label
                        htmlFor="new-api-url"
                        className="text-xs sm:text-sm font-medium mb-2 block"
                      >
                        Add Custom API
                      </Label>
                      <div className={stack({ gap: "sm" })}>
                        <div className={hstack({ gap: "sm" })}>
                          <Input
                            id="new-api-url"
                            placeholder="https://example.com/stac"
                            value={newApiUrl}
                            onChange={(e) => setNewApiUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isValidating}
                            className={`flex-1 text-xs sm:text-sm ${
                              newApiUrl && !validateUrl(newApiUrl)
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                          />
                          <Button
                            onClick={handleAddApi}
                            variant="outline"
                            size="sm"
                            disabled={
                              !newApiUrl ||
                              !validateUrl(newApiUrl) ||
                              availableApis.includes(newApiUrl.trim()) ||
                              isValidating
                            }
                            className="text-xs sm:text-sm shrink-0"
                          >
                            {isValidating ? (
                              <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                            <span className="hidden sm:inline">
                              {isValidating ? "Validating..." : "Add"}
                            </span>
                            <span className="sm:hidden">
                              {isValidating ? "..." : "+"}
                            </span>
                          </Button>
                        </div>
                        {newApiUrl && !validateUrl(newApiUrl) && (
                          <p className="text-xs text-destructive">
                            Please enter a valid URL
                          </p>
                        )}
                        {newApiUrl &&
                          validateUrl(newApiUrl) &&
                          availableApis.includes(newApiUrl.trim()) && (
                            <p className="text-xs text-destructive">
                              This API is already in the list
                            </p>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      {errors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent
                value="diagnostics"
                className={cn(stack({ gap: "md" }), "mt-4")}
              >
                {healthLoading ? (
                  <div className="py-8 sm:py-12">
                    <LoadingSpinner size="md" text="Checking API health..." />
                  </div>
                ) : healthData ? (
                  <>
                    <Card>
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                healthData.status === "UP"
                                  ? "rgb(34 197 94)"
                                  : "rgb(239 68 68)",
                            }}
                          />
                          <span className="font-semibold text-sm sm:text-base">
                            Overall Status
                          </span>
                          <Badge
                            variant={
                              healthData.status === "UP"
                                ? "default"
                                : "destructive"
                            }
                            className="ml-auto text-xs"
                          >
                            {healthData.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <div className={stack({ gap: "sm" })}>
                      <h3 className="font-semibold text-xs sm:text-sm">
                        Upstream APIs
                      </h3>
                      {Object.entries(healthData.upstream_apis).map(
                        ([url, api]) => {
                          const conformance =
                            api.collection_search_conformance || [];
                          const hasCollectionSearch =
                            hasCollectionSearchSupport(conformance);
                          const hasFreeText = hasFreeTextSupport(conformance);

                          return (
                            <Card key={url}>
                              <CardContent
                                className={cn(
                                  stack({ gap: "sm" }),
                                  "pt-3 sm:pt-4"
                                )}
                              >
                                <div className={hstack({ gap: "sm" })}>
                                  <div
                                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: api.healthy
                                        ? "rgb(34 197 94)"
                                        : "rgb(239 68 68)",
                                    }}
                                  />
                                  <span className="text-xs sm:text-sm font-medium break-all">
                                    {url}
                                  </span>
                                </div>

                                <div
                                  className={cn(
                                    hstack({ gap: "xs" }),
                                    "flex-wrap"
                                  )}
                                >
                                  <Badge
                                    variant={
                                      hasCollectionSearch
                                        ? "default"
                                        : "destructive"
                                    }
                                    className="text-[10px] sm:text-xs"
                                  >
                                    {hasCollectionSearch
                                      ? "Collection Search ✓"
                                      : "No Collection Search"}
                                  </Badge>
                                  <Badge
                                    variant={
                                      hasFreeText ? "default" : "secondary"
                                    }
                                    className={`text-[10px] sm:text-xs ${
                                      !hasFreeText
                                        ? "bg-orange-100 dark:bg-orange-900"
                                        : ""
                                    }`}
                                  >
                                    {hasFreeText
                                      ? "Free Text ✓"
                                      : "No Free Text"}
                                  </Badge>
                                </div>

                                {conformance.length > 0 && (
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                                    <span className="font-medium">
                                      Conformance:
                                    </span>{" "}
                                    {conformance.join(", ")}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        }
                      )}
                    </div>

                    {/* Summary of limitations */}
                    {(() => {
                      const apisLackingCollectionSearch =
                        getApisLackingCapability(
                          healthData,
                          "collection-search"
                        );
                      const apisLackingFreeText = getApisLackingCapability(
                        healthData,
                        "free-text"
                      );

                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm sm:text-base">
                              Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent className={stack({ gap: "sm" })}>
                            {apisLackingCollectionSearch.length > 0 && (
                              <Alert variant="destructive">
                                <AlertDescription>
                                  <p className="text-xs sm:text-sm font-medium mb-1">
                                    APIs lacking collection search support:
                                  </p>
                                  <p className="text-[10px] sm:text-xs break-all">
                                    {apisLackingCollectionSearch.join(", ")}
                                  </p>
                                </AlertDescription>
                              </Alert>
                            )}

                            {apisLackingFreeText.length > 0 && (
                              <Alert className="border-orange-200 dark:border-orange-800">
                                <AlertDescription>
                                  <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
                                    APIs lacking free-text search support:
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground break-all">
                                    {apisLackingFreeText.join(", ")}
                                  </p>
                                </AlertDescription>
                              </Alert>
                            )}

                            {apisLackingCollectionSearch.length === 0 &&
                              apisLackingFreeText.length === 0 && (
                                <Alert className="border-green-200 dark:border-green-800">
                                  <AlertDescription className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                                    All configured APIs support collection
                                    search and free-text search! ✓
                                  </AlertDescription>
                                </Alert>
                              )}
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </>
                ) : (
                  <Card>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="text-center py-6 sm:py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                        <p className="text-xs sm:text-sm font-medium">
                          No health data available
                        </p>
                        <p className="text-[10px] sm:text-xs mt-1">
                          {stacApis.length === 0
                            ? "Configure APIs in the Configuration tab to see diagnostics"
                            : "Unable to fetch API health information"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className={hstack({ gap: "sm" })}>
            <Button
              onClick={() => setIsOpen(false)}
              className="text-xs sm:text-sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Info Modal */}
      <Dialog open={isFilterInfoOpen} onOpenChange={setIsFilterInfoOpen}>
        <DialogContent className={cn(dialog({ size: "md" }), "p-4 sm:p-6")}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Filter Details
            </DialogTitle>
          </DialogHeader>
          {selectedFilterInfo && (
            <div className={stack({ gap: "sm" })}>
              <div>
                <p className="font-bold mb-1 sm:mb-2 text-xs sm:text-sm">
                  API URL:
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground break-all">
                  {selectedFilterInfo.url}
                </p>
              </div>

              <div>
                <p className="font-bold mb-1 sm:mb-2 text-xs sm:text-sm">
                  Filter Description:
                </p>
                <p className="text-xs sm:text-sm">
                  {selectedFilterInfo.description}
                </p>
              </div>

              <div>
                <p className="font-bold mb-1 sm:mb-2 text-xs sm:text-sm">
                  Filter Code:
                </p>
                <pre className="rounded-md bg-muted p-3 text-[11px] overflow-x-auto">
                  <code className="font-mono">{selectedFilterInfo.code}</code>
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsFilterInfoOpen(false)}
              className="text-xs sm:text-sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiConfigPanel;
