import React, { useRef } from "react";
import {
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
} from "@chakra-ui/react";
import { MapContainer, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import CommonTileLayer from "./CommonTileLayer";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bbox: string) => void;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const handleDrawStop = () => {
    if (!featureGroupRef.current) return;

    const layers = featureGroupRef.current.getLayers();
    if (!layers.length) return;

    const layer = layers[0] as L.Rectangle;
    if (!layer.getBounds) return;

    const bounds = layer.getBounds();

    const southWestLng = bounds.getSouthWest().lng.toFixed(2);
    const southWestLat = bounds.getSouthWest().lat.toFixed(2);
    const northEastLng = bounds.getNorthEast().lng.toFixed(2);
    const northEastLat = bounds.getNorthEast().lat.toFixed(2);

    const bbox = `${southWestLng}, ${southWestLat}, ${northEastLng}, ${northEastLat}`;

    onSubmit(bbox);
  };

  const handleClearAll = () => {
    if (!featureGroupRef.current) return;

    featureGroupRef.current.clearLayers();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Draw Bounding Box</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box height="500px">
            <MapContainer
              style={{ height: "100%", width: "100%" }}
              center={[0, 0]}
              zoom={1}
              scrollWheelZoom={true}
            >
              <CommonTileLayer />
              <FeatureGroup ref={featureGroupRef}>
                <EditControl
                  position="topright"
                  onEdited={handleDrawStop}
                  onCreated={handleDrawStop}
                  draw={{
                    rectangle: true,
                    circle: false,
                    polyline: false,
                    polygon: false,
                    marker: false,
                    circlemarker: false,
                  }}
                  edit={{
                    edit: false,
                    remove: true,
                  }}
                />
              </FeatureGroup>
            </MapContainer>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={handleDrawStop}>
            Submit
          </Button>
          <Button onClick={handleClearAll} ml={3}>
            Clear All
          </Button>
          <Button variant="ghost" onClick={onClose} ml={3}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MapModal;
