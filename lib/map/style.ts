import type { StyleSpecification } from "maplibre-gl";

export type StyleMode = "dark" | "satellite";

const CARTO_SUBDOMAINS = ["a", "b", "c", "d"] as const;

function cartoTileset(layer: "dark_nolabels" | "dark_only_labels"): string[] {
  return CARTO_SUBDOMAINS.map(
    (s) => `https://${s}.basemaps.cartocdn.com/${layer}/{z}/{x}/{y}@2x.png`,
  );
}

const ESRI_IMAGERY_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
];

const ESRI_LABELS_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
];

export function createDarkStyle(): StyleSpecification {
  return {
    version: 8,
    name: "Tbilisi Dark",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "carto-dark": {
        type: "raster",
        tiles: cartoTileset("dark_nolabels"),
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
        maxzoom: 20,
      },
      "carto-labels": {
        type: "raster",
        tiles: cartoTileset("dark_only_labels"),
        tileSize: 256,
        maxzoom: 20,
      },
    },
    layers: [
      {
        id: "bg",
        type: "background",
        paint: { "background-color": "#0a0e1a" },
      },
      {
        id: "carto-base",
        type: "raster",
        source: "carto-dark",
        paint: {
          "raster-opacity": 1,
          "raster-saturation": -0.4,
          "raster-contrast": 0.05,
        },
      },
      {
        id: "carto-labels",
        type: "raster",
        source: "carto-labels",
        paint: { "raster-opacity": 0.85 },
      },
    ],
  };
}

export function createSatelliteStyle(): StyleSpecification {
  return {
    version: 8,
    name: "Tbilisi Satellite",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "esri-imagery": {
        type: "raster",
        tiles: ESRI_IMAGERY_TILES,
        tileSize: 256,
        maxzoom: 21,
        attribution:
          'Tiles © <a href="https://www.esri.com/">Esri</a>',
      },
      "esri-labels": {
        type: "raster",
        tiles: ESRI_LABELS_TILES,
        tileSize: 256,
        maxzoom: 21,
      },
    },
    layers: [
      {
        id: "bg",
        type: "background",
        paint: { "background-color": "#0a0e1a" },
      },
      {
        id: "esri-imagery",
        type: "raster",
        source: "esri-imagery",
        paint: {
          "raster-opacity": 1,
          "raster-saturation": -0.1,
        },
      },
      {
        id: "esri-labels",
        type: "raster",
        source: "esri-labels",
        paint: {
          "raster-opacity": 0.9,
        },
      },
    ],
  };
}

export const STYLE_BUILDERS: Record<StyleMode, () => StyleSpecification> = {
  dark: createDarkStyle,
  satellite: createSatelliteStyle,
};
