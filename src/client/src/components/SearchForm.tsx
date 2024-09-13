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
  Select,
  useDisclosure,
  Spacer,
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
  hint_lang: string;
};

interface Props {
  onSubmit: (data: FormData) => void;
  apiDocs: any;
}

const GitHubLogo = require("../assets/github-mark.svg").default;

const SearchForm: React.FC<Props> = ({ onSubmit, apiDocs }) => {
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
    hint_lang: "python",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
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
    event?.preventDefault(); // Prevent default form submission
    const datetime = formatDateInterval(
      formData.startDatetime,
      formData.endDatetime,
    );
    const submitData = {
      bbox: formData.bbox,
      datetime,
      q: formData.q,
      hint_lang: formData.hint_lang,
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

  return (
    <form onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
      <VStack spacing={4} align="stretch">
        <FormControl id="bbox">
          <FormLabel>Bounding Box Coordinates</FormLabel>
          <Input
            name="bbox"
            value={formData.bbox}
            onChange={handleChange}
            placeholder="Enter bounding box"
          />
          <Button onClick={onMapOpen} mt={2} colorScheme="teal">
            Draw on Map
          </Button>
        </FormControl>

        <FormControl>
          <FormLabel>Temporal Range</FormLabel>
          <Flex direction="row">
            <FormControl id="startDatetime" maxWidth="45%">
              <FormLabel>Start Date</FormLabel>
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
              <FormLabel>End Date</FormLabel>
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
        <FormControl id="q">
          <FormLabel>Text Search</FormLabel>
          <Input
            name="q"
            value={formData.q}
            onChange={handleChange}
            placeholder="Enter text"
          />
        </FormControl>
        <FormControl id="hint_lang">
          <FormLabel>Programming language for item search hint</FormLabel>
          <Select
            name="hint_lang"
            value={formData.hint_lang}
            onChange={handleChange}
          >
            <option value="python">Python</option>
          </Select>
        </FormControl>
        <HStack justify="space-between" width="100%">
          <Button onClick={onDocOpen} colorScheme="blue">
            API docs
          </Button>
          <Button
            as="a"
            href="https://github.com/developmentseed/federated-collection-discovery"
            colorScheme="orange"
            leftIcon={<Image src={GitHubLogo} boxSize="1.5em" alt="GitHub" />}
            target="_blank"
            rel="noopener noreferrer"
          >
            source
          </Button>
          <Button type="submit" colorScheme="teal">
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
