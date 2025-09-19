import React, { useState } from "react";
import {
  Image,
  Input,
  Button,
  Flex,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useDisclosure,
  Spacer,
  Text,
} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import MapModal from "./MapModal";
import ApiDocModal from "./ApiDocModal"; // Import the new modal component

import "../css/react-datepicker.css";

type FormData = {
  bbox: string;
  datetime: string;
  q: string;
};

interface Props {
  onSubmit: (data: FormData) => void;
  apiDocs: any;
  apiError?: string | null; // API-level errors
  isLoading?: boolean;
  conformanceCapabilities?: {
    hasCollectionSearch: boolean;
    hasFreeText: boolean;
  } | null;
  conformanceLoading?: boolean;
}

const GitHubLogo = require("../assets/github-mark.svg").default;

const SearchForm: React.FC<Props> = ({
  onSubmit,
  apiDocs,
  isLoading,
  conformanceCapabilities,
  conformanceLoading
}) => {
  const {
    isOpen: isMapOpen,
    onOpen: onMapOpen,
    onClose: onMapClose,
  } = useDisclosure();
  const {
    isOpen: isDocOpen,
    onOpen: onDocOpen,
    onClose: onDocClose,
  } = useDisclosure();
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

  // Add state for validation error
  const [bboxError, setBboxError] = useState<string>("");

  // Validation function for bounding box
  const validateBbox = (value: string): boolean => {
    if (!value) return true; // Empty value is valid (optional field)

    // Remove multiple spaces and trim
    const cleanedValue = value.replace(/\s+/g, " ").trim();

    // Split by comma or space
    const coordinates = cleanedValue.split(/[\s,]+/);

    if (coordinates.length !== 4) {
      setBboxError("Please enter exactly 4 numbers");
      return false;
    }

    // Check if all values are valid numbers
    const isValid = coordinates.every((coord) => {
      const num = Number(coord);
      return !isNaN(num) && isFinite(num);
    });

    if (!isValid) {
      setBboxError("All values must be valid numbers");
      return false;
    }

    // Clear error if validation passes
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
        formattedDate.setHours(0, 0, 0, 0); // Set time to 00:00:00
      } else {
        formattedDate.setHours(23, 59, 59, 999); // Set time to 23:59:59
      }
      return (
        formattedDate.toISOString().replace(".999Z", "").replace(".000Z", "") +
        "Z"
      );
    };
    if (!start && !end) return ""; // both dates are missing
    return `${dateFormatter(start)}/${dateFormatter(end, false)}`;
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    // Validate bbox before submission
    if (!validateBbox(formData.bbox)) {
      return; // Prevent submission if validation fails
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
    onMapClose();
  };

  const today = new Date(); // Get today's date for maxDate

  // Check if text search should be disabled - only disable when we have explicit conformance data showing no support
  const isTextSearchDisabled = conformanceCapabilities ? !conformanceCapabilities.hasFreeText : false;

  return (
    <form onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
      <VStack spacing={4} align="stretch">
        <FormControl id="q">
          <strong>text search</strong>
          <Input
            name="q"
            value={formData.q}
            onChange={handleChange}
            placeholder={isTextSearchDisabled ? "Text search not available" : "Enter text"}
            disabled={isTextSearchDisabled}
          />
          {isTextSearchDisabled && (
            <Text fontSize="sm" color="gray.500" mt={1}>
              Text search is disabled - no upstream APIs support free-text search
            </Text>
          )}
        </FormControl>
        <FormControl id="bbox" isInvalid={!!bboxError}>
          <strong>bounding box</strong> (xmin, ymin , xmax, ymax; EPSG:4326)
          <Input
            name="bbox"
            value={formData.bbox}
            onChange={handleChange}
            placeholder="Enter bounding box"
          />
          {bboxError && <FormErrorMessage>{bboxError}</FormErrorMessage>}
          <Button onClick={onMapOpen} mt={2} colorScheme="teal">
            Draw on Map
          </Button>
        </FormControl>

        <FormControl>
          <strong>temporal range</strong>
          <Flex direction="row">
            <FormControl id="startDatetime" maxWidth="45%">
              <DatePicker
                selected={formData.startDatetime}
                onChange={(date) => handleDateChange(date, "startDatetime")}
                maxDate={today} // Limiting date to today
                placeholderText="start date"
                className="customDatePickerWidth" // Applying custom CSS class
              />
            </FormControl>
            <Spacer />
            <FormControl id="endDatetime" maxWidth="45%">
              <DatePicker
                selected={formData.endDatetime}
                onChange={(date) => handleDateChange(date, "endDatetime")}
                maxDate={today} // Limiting date to today
                placeholderText="end date"
                className="customDatePickerWidth" // Applying custom CSS class
              />
            </FormControl>
          </Flex>
        </FormControl>
        <HStack justify="space-between" width="100%" wrap="wrap" spacing={2}>
          <Button onClick={onDocOpen} colorScheme="blue" size="sm">
            API docs
          </Button>
          <Button
            as="a"
            href="https://github.com/developmentseed/federated-collection-discovery"
            colorScheme="orange"
            leftIcon={<Image src={GitHubLogo} boxSize="1.5em" alt="GitHub" />}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            source
          </Button>
          <Button type="submit" colorScheme="teal" isLoading={isLoading} size="sm">
            Search
          </Button>
        </HStack>

        <MapModal
          isOpen={isMapOpen}
          onClose={onMapClose}
          onSubmit={updateBoundingBox}
        />
        <ApiDocModal
          isOpen={isDocOpen}
          onClose={onDocClose}
          apiDocs={apiDocs}
        />
      </VStack>
    </form>
  );
};

export default SearchForm;
