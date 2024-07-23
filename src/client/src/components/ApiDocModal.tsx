import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Spinner,
  Box,
  useColorMode,
} from "@chakra-ui/react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { getApiDocs } from "../api/search";

// Custom swagger style override for dark mode only
import "../css/swagger-dark.css";

interface ApiDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiDocModal: React.FC<ApiDocModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [apiDoc, setApiDoc] = useState<any>(null);
  const { colorMode } = useColorMode();

  useEffect(() => {
    if (isOpen) {
      (async function fetchApiDocs() {
        setLoading(true);
        try {
          const data = await getApiDocs();
          setApiDoc(data);
        } catch (error) {
          setApiDoc(null);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>API Documentation</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading ? (
            <Spinner />
          ) : (
            apiDoc && (
              <Box overflow="auto" maxHeight="70vh">
                {/* Apply dark mode class conditionally */}
                <div className={colorMode === "dark" ? "swagger-dark" : ""}>
                  <SwaggerUI spec={apiDoc} />
                </div>
              </Box>
            )
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ApiDocModal;
