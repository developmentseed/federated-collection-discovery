import { OSM } from "ol/source";
import { Fill, Stroke, Style } from "ol/style";
import Attribution from "ol/control/Attribution";

/**
 * Get the basemap tile source based on dark mode
 */
export function getBasemapSource(isDark: boolean) {
  return isDark
    ? new OSM({
        url: "https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        attributions:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      })
    : new OSM();
}

/**
 * Create attribution control with dark mode styling
 */
export function createAttributionControl(isDark: boolean) {
  const attribution = new Attribution({
    collapsible: false,
  });

  // Style the attribution for dark mode
  if (isDark) {
    // We'll need to style it after it's added to the map
    setTimeout(() => {
      const attributionElement = document.querySelector(
        ".ol-attribution"
      ) as HTMLElement;
      if (attributionElement) {
        attributionElement.style.color = "white";
        attributionElement.style.background = "rgba(0, 0, 0, 0.5)";
        // Style all links inside the attribution
        const links = attributionElement.querySelectorAll("a");
        links.forEach((link) => {
          (link as HTMLElement).style.color = "white";
        });
      }
    }, 100);
  }

  return attribution;
}

/**
 * Get the style for vector polygons with transparent fill
 */
export function getTransparentPolygonStyle(strokeColor = "#ffcc33") {
  return new Style({
    fill: new Fill({
      color: "rgba(0, 0, 0, 0)",
    }),
    stroke: new Stroke({
      color: strokeColor,
      width: 2,
    }),
  });
}

/**
 * Get the style for STAC bounds with transparent fill
 */
export function getStacBoundsStyle(strokeColor = "#3399CC") {
  return new Style({
    fill: new Fill({
      color: "rgba(0, 0, 0, 0)",
    }),
    stroke: new Stroke({
      color: strokeColor,
      width: 3,
    }),
  });
}
