import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  useColorMode,
} from "@chakra-ui/react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

// Custom swagger style override for dark mode only
import "../css/swagger-dark.css";

interface ApiDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiDocs: any;
}

const ApiDocModal: React.FC<ApiDocModalProps> = ({
  isOpen,
  onClose,
  apiDocs,
}) => {
  const { colorMode } = useColorMode();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>API Documentation</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box overflow="auto" maxHeight="70vh">
            {/* Apply dark mode class conditionally */}
            <div className={colorMode === "dark" ? "swagger-dark" : ""}>
              <SwaggerUI spec={apiDocs} />
            </div>
          </Box>
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
