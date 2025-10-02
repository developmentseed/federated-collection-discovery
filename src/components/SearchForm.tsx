import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { DatePicker } from "./ui/date-picker";
import MapModal from "./MapModal";
import { cn } from "../lib/utils";

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

const SearchForm: React.FC<Props> = ({
  onSubmit,
  isLoading,
  conformanceCapabilities,
  conformanceLoading
}) => {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const [formData, setFormData] = useState<
    Omit<FormData, "datetime"> & {
      startDatetime: Date | null;
      endDatetime: Date | null;
    }
  >({
    bbox: "",
    startDatetime: null,
    endDatetime: null,
    q: "",
  });

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
  const isTextSearchDisabled = conformanceCapabilities ? !conformanceCapabilities.hasFreeText : false;

  return (
    <form onKeyDown={handleKeyDown} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="q" className="font-semibold">text search</Label>
        <Input
          id="q"
          name="q"
          value={formData.q}
          onChange={handleChange}
          placeholder={isTextSearchDisabled ? "Text search not available" : "Enter text"}
          disabled={isTextSearchDisabled}
        />
        {isTextSearchDisabled && (
          <p className="text-sm text-muted-foreground">
            Text search is disabled - no upstream APIs support free-text search
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bbox" className="font-semibold">
          bounding box <span className="font-normal text-muted-foreground">(xmin, ymin, xmax, ymax; EPSG:4326)</span>
        </Label>
        <Input
          id="bbox"
          name="bbox"
          value={formData.bbox}
          onChange={handleChange}
          placeholder="Enter bounding box"
          className={cn(bboxError && "border-destructive")}
        />
        {bboxError && (
          <p className="text-sm text-destructive">{bboxError}</p>
        )}
        <Button
          type="button"
          onClick={() => setIsMapOpen(true)}
          variant="outline"
          size="sm"
        >
          Draw on Map
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">temporal range</Label>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <DatePicker
              date={formData.startDatetime}
              onSelect={(date) => handleDateChange(date || null, "startDatetime")}
              maxDate={today}
              placeholder="start date"
            />
          </div>
          <div className="flex-1">
            <DatePicker
              date={formData.endDatetime}
              onSelect={(date) => handleDateChange(date || null, "endDatetime")}
              maxDate={today}
              placeholder="end date"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          variant="outline"
          size="sm"
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
