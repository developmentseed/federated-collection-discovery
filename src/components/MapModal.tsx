import React, { useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import { fromLonLat, toLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import { Coordinate } from "ol/coordinate";
import Polygon from "ol/geom/Polygon";
import "ol/ol.css";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bbox: string) => void;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const drawRef = useRef<Draw | null>(null);

  const handleDrawStop = () => {
    if (!vectorSourceRef.current) return;

    const features = vectorSourceRef.current.getFeatures();
    if (!features.length) return;

    const feature = features[features.length - 1]; // Get the latest drawn feature
    const geometry = feature.getGeometry();
    if (!geometry) return;

    const extent = geometry.getExtent();

    // Transform from Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
    const bottomLeft = toLonLat([extent[0], extent[1]]);
    const topRight = toLonLat([extent[2], extent[3]]);

    const bbox = `${bottomLeft[0].toFixed(6)}, ${bottomLeft[1].toFixed(6)}, ${topRight[0].toFixed(6)}, ${topRight[1].toFixed(6)}`;
    onSubmit(bbox);
  };

  const handleClearAll = () => {
    if (!vectorSourceRef.current) return;
    vectorSourceRef.current.clear();
  };

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Add a small delay to ensure the modal DOM is fully rendered
    const initMap = () => {
      if (!mapRef.current) {
        console.log("Map ref not available");
        return;
      }

      // Clean up existing map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.dispose();
        mapInstanceRef.current = null;
      }

      try {
        console.log("Initializing OpenLayers map...");

        const vectorSource = new VectorSource();
        vectorSourceRef.current = vectorSource;

        const vectorLayer = new VectorLayer({
          source: vectorSource,
          style: new Style({
            fill: new Fill({
              color: "rgba(255, 255, 255, 0.2)",
            }),
            stroke: new Stroke({
              color: "#ffcc33",
              width: 2,
            }),
          }),
        });

        const map = new Map({
          target: mapRef.current,
          layers: [
            new TileLayer({
              source: new OSM(),
            }),
            vectorLayer,
          ],
          view: new View({
            center: fromLonLat([0, 0]),
            zoom: 0,
          }),
        });

        // Use Box drawing for corner-to-corner rectangle drawing
        const draw = new Draw({
          source: vectorSource,
          type: "Circle",
          geometryFunction: (coordinates, geometry) => {
            if (
              !coordinates ||
              !Array.isArray(coordinates) ||
              coordinates.length < 2
            )
              return geometry;

            const start = coordinates[0] as Coordinate;
            const end = coordinates[1] as Coordinate;

            // Create rectangle from two corner points
            const minX = Math.min(start[0], end[0]);
            const minY = Math.min(start[1], end[1]);
            const maxX = Math.max(start[0], end[0]);
            const maxY = Math.max(start[1], end[1]);

            const coords = [
              [
                [minX, minY],
                [maxX, minY],
                [maxX, maxY],
                [minX, maxY],
                [minX, minY],
              ],
            ];

            if (!geometry) {
              geometry = new Polygon(coords);
            } else {
              geometry.setCoordinates(coords);
            }

            return geometry;
          },
        });

        draw.on("drawend", () => {
          setTimeout(handleDrawStop, 100);
        });

        map.addInteraction(draw);
        mapInstanceRef.current = map;
        drawRef.current = draw;

        console.log("Map initialized successfully");

        // Force map to update size after initialization
        setTimeout(() => {
          map.updateSize();
          console.log("Map size updated");
        }, 100);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    // Delay initialization to ensure modal is fully rendered
    const timeoutId = setTimeout(initMap, 300);

    return () => {
      clearTimeout(timeoutId);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.dispose();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Draw Bounding Box</DialogTitle>
        </DialogHeader>
        <div className="h-[500px] w-full">
          <div
            ref={mapRef}
            style={{
              height: "500px",
              width: "100%",
              position: "relative",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ccc",
            }}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleDrawStop}>Submit</Button>
          <Button variant="outline" onClick={handleClearAll}>
            Clear All
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MapModal;
