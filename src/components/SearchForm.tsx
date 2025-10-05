import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { DatePicker } from "./ui/date-picker";
import MapModal from "./MapModal";
import { cn } from "../lib/utils";
import { stack, touchTarget, layout } from "../lib/responsive";

type FormData = {
  bbox: string;
  datetime: string;
  q: string;
};

interface Props {
  onSubmit: (data: FormData) => void;
  apiError?: string | null;
  isLoading?: boolean;
  conformanceCapabilities?: {
    hasCollectionSearch: boolean;
    hasFreeText: boolean;
  } | null;
  conformanceLoading?: boolean;
}

// Parse datetime interval from URL parameter
const parseDatetimeInterval = (
  datetime: string,
): { start: Date | null; end: Date | null } => {
  if (!datetime) return { start: null, end: null };

  const parts = datetime.split("/");
  const start = parts[0] && parts[0] !== ".." ? new Date(parts[0]) : null;
  const end = parts[1] && parts[1] !== ".." ? new Date(parts[1]) : null;

  return { start, end };
};

// Initialize form data from URL parameters
const getInitialFormData = () => {
  const params = new URLSearchParams(window.location.search);
  const datetime = params.get("datetime") || "";
  const { start, end } = parseDatetimeInterval(datetime);

  return {
    bbox: params.get("bbox") || "",
    startDatetime: start,
    endDatetime: end,
    q: params.get("q") || "",
  };
};

const SearchForm: React.FC<Props> = ({
  onSubmit,
  isLoading,
  conformanceCapabilities,
}) => {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const [formData, setFormData] = useState<
    Omit<FormData, "datetime"> & {
      startDatetime: Date | null;
      endDatetime: Date | null;
    }
  >(getInitialFormData);

  const [bboxError, setBboxError] = useState<string>("");

  const validateBbox = (value: string): boolean => {
    if (!value) return true;

    const cleanedValue = value.replace(/\s+/g, " ").trim();
    const coordinates = cleanedValue.split(/[\s,]+/);

    if (coordinates.length !== 4) {
      setBboxError("Please enter exactly 4 numbers");
      return false;
    }

    const isValid = coordinates.every((coord) => {
      const num = Number(coord);
      return !isNaN(num) && isFinite(num);
    });

    if (!isValid) {
      setBboxError("All values must be valid numbers");
      return false;
    }

    setBboxError("");
    return true;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "bbox") {
      validateBbox(value);
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (
    date: Date | null,
    field: "startDatetime" | "endDatetime",
  ) => {
    setFormData({ ...formData, [field]: date });
  };

  const formatDateInterval = (start: Date | null, end: Date | null): string => {
    const dateFormatter = (date: Date | null, isStart = true) => {
      if (!date) return "..";
      const formattedDate = new Date(date);
      if (isStart) {
        formattedDate.setHours(0, 0, 0, 0);
      } else {
        formattedDate.setHours(23, 59, 59, 999);
      }
      return (
        formattedDate.toISOString().replace(".999Z", "").replace(".000Z", "") +
        "Z"
      );
    };
    if (!start && !end) return "";
    return `${dateFormatter(start)}/${dateFormatter(end, false)}`;
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!validateBbox(formData.bbox)) {
      return;
    }

    const datetime = formatDateInterval(
      formData.startDatetime,
      formData.endDatetime,
    );
    const submitData = {
      bbox: formData.bbox,
      datetime,
      q: formData.q,
    };

    // Update URL with search parameters
    const params = new URLSearchParams();
    if (submitData.q) params.set("q", submitData.q);
    if (submitData.bbox) params.set("bbox", submitData.bbox);
    if (submitData.datetime) params.set("datetime", submitData.datetime);

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);

    onSubmit(submitData);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  const updateBoundingBox = (bbox: string) => {
    setFormData({ ...formData, bbox });
    setIsMapOpen(false);
  };

  const today = new Date();
  const isTextSearchDisabled = conformanceCapabilities
    ? !conformanceCapabilities.hasFreeText
    : false;

  return (
    <form
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
      className={stack({ gap: "md" })}
      aria-label="Collection search form"
    >
      <div className={stack({ gap: "sm" })}>
        <Label htmlFor="q" className="font-semibold">
          text search
        </Label>
        <Input
          id="q"
          name="q"
          value={formData.q}
          onChange={handleChange}
          placeholder={
            isTextSearchDisabled ? "Text search not available" : "Enter text"
          }
          disabled={isTextSearchDisabled}
          aria-describedby={isTextSearchDisabled ? "q-help" : undefined}
        />
        {isTextSearchDisabled && (
          <p id="q-help" className="text-sm text-muted-foreground">
            Text search is disabled - no upstream APIs support free-text search
          </p>
        )}
      </div>

      <div className={stack({ gap: "sm" })}>
        <Label htmlFor="bbox" className="font-semibold">
          bounding box{" "}
          <span className="font-normal text-muted-foreground">
            (xmin, ymin, xmax, ymax; EPSG:4326)
          </span>
        </Label>
        <Input
          id="bbox"
          name="bbox"
          value={formData.bbox}
          onChange={handleChange}
          placeholder="Enter bounding box"
          className={cn(bboxError && "border-destructive")}
          aria-invalid={!!bboxError}
          aria-describedby={bboxError ? "bbox-error" : "bbox-help"}
        />
        <span id="bbox-help" className="sr-only">
          Format: xmin, ymin, xmax, ymax in EPSG:4326
        </span>
        {bboxError && (
          <p id="bbox-error" className="text-sm text-destructive" role="alert">
            {bboxError}
          </p>
        )}
        <Button
          type="button"
          onClick={() => setIsMapOpen(true)}
          variant="outline"
          size="sm"
          className={touchTarget()}
          aria-label="Open map to draw bounding box"
        >
          Draw on Map
        </Button>
      </div>

      <fieldset className={stack({ gap: "sm" })}>
        <legend className="font-semibold">temporal range</legend>
        <div className={cn(layout.flexColSm, "gap-4")}>
          <div className="flex-1">
            <Label htmlFor="start-date" className="sr-only">
              Start date
            </Label>
            <DatePicker
              date={formData.startDatetime}
              onSelect={(date) =>
                handleDateChange(date || null, "startDatetime")
              }
              maxDate={today}
              placeholder="start date"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="end-date" className="sr-only">
              End date
            </Label>
            <DatePicker
              date={formData.endDatetime}
              onSelect={(date) => handleDateChange(date || null, "endDatetime")}
              maxDate={today}
              placeholder="end date"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          variant="outline"
          size="sm"
          className={cn(touchTarget(), "min-w-[100px]")}
          aria-label={
            isLoading ? "Searching collections" : "Search for collections"
          }
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSubmit={(bbox) => {
          updateBoundingBox(bbox);
          setIsMapOpen(false);
        }}
      />
    </form>
  );
};

export default SearchForm;
