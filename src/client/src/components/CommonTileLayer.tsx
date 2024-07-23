import React from "react";
import { TileLayer } from "react-leaflet";

const CommonTileLayer: React.FC = () => {
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
  );
};

export default CommonTileLayer;
