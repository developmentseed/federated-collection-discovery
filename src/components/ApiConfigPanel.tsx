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
    null
  );
  const [healthLoading, setHealthLoading] = React.useState(true);

  // API management state
  const [editableApis, setEditableApis] = useState<string[]>(stacApis);
  const [newApiUrl, setNewApiUrl] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const defaultApis = React.useMemo(
    () => getApiConfigurations().map((config) => config.url),
    []
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
      (api) => api.trim() !== "" && validateUrl(api)
    );
    const invalidApis = editableApis.filter(
      (api) => api.trim() !== "" && !validateUrl(api)
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

                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {errors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center gap-2">
                      <CardTitle className="text-sm sm:text-base">
                        Default APIs
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
                  <CardContent className={stack({ gap: "sm" })}>
                    {defaultApis.map((api) => (
                      <div
                        key={api}
                        className={cn(hstack({ gap: "sm" }), "py-1")}
                      >
                        <Switch
                          id={`api-${api}`}
                          checked={editableApis.includes(api)}
                          onCheckedChange={(checked) =>
                            handleToggleDefaultApi(api, checked)
                          }
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
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">
                      Custom APIs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={stack({ gap: "md" })}>
                    <div className={stack({ gap: "sm" })}>
                      {editableApis
                        .filter((api) => !defaultApis.includes(api))
                        .map((api, _) => {
                          const actualIndex = editableApis.indexOf(api);
                          const isValid = validateUrl(api);
                          return (
                            <div
                              key={actualIndex}
                              className={stack({ gap: "xs" })}
                            >
                              <div className={hstack({ gap: "sm" })}>
                                <Input
                                  value={api}
                                  onChange={(e) =>
                                    handleUpdateApi(actualIndex, e.target.value)
                                  }
                                  placeholder="https://example.com/stac"
                                  className={`flex-1 text-xs sm:text-sm ${
                                    !isValid ? "border-destructive" : ""
                                  }`}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveApi(actualIndex)}
                                  className="h-9 w-9 p-0 shrink-0"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                              {!isValid && (
                                <p className="text-xs text-destructive ml-1">
                                  Invalid URL format
                                </p>
                              )}
                            </div>
                          );
                        })}
                      {editableApis.filter((api) => !defaultApis.includes(api))
                        .length === 0 && (
                        <div className="text-center py-4 sm:py-6 text-muted-foreground">
                          <p className="text-xs sm:text-sm">
                            No custom APIs added yet
                          </p>
                          <p className="text-xs mt-1">
                            Add a custom STAC API endpoint below
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
                              editableApis.includes(newApiUrl.trim())
                            }
                            className="text-xs sm:text-sm shrink-0"
                          >
                            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Add</span>
                            <span className="sm:hidden">+</span>
                          </Button>
                        </div>
                        {newApiUrl && !validateUrl(newApiUrl) && (
                          <p className="text-xs text-destructive">
                            Please enter a valid URL
                          </p>
                        )}
                        {newApiUrl &&
                          validateUrl(newApiUrl) &&
                          editableApis.includes(newApiUrl.trim()) && (
                            <p className="text-xs text-destructive">
                              This API is already in the list
                            </p>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            {activeTab === "configuration" && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} className="text-xs sm:text-sm">
                  Save Changes
                </Button>
              </>
            )}
            {activeTab === "diagnostics" && (
              <Button
                onClick={() => setIsOpen(false)}
                className="text-xs sm:text-sm"
              >
                Close
              </Button>
            )}
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
                <SyntaxHighlighter
                  language="javascript"
                  style={syntaxStyle}
                  customStyle={{ fontSize: "11px", borderRadius: "6px" }}
                >
                  {selectedFilterInfo.code}
                </SyntaxHighlighter>
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
