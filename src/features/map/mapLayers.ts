import type { LayerSpecification } from "maplibre-gl";

import {
  clusterCountSizeExpression,
  clusterRadiusExpression,
  magnitudeRadiusExpression,
  mapIds,
  mapTheme,
} from "../../theme/mapTheme";

export const earthquakeLayers: readonly LayerSpecification[] = [
  {
    id: mapIds.clustersLayer,
    type: "circle",
    source: mapIds.catalogueSource,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": mapTheme.cluster,
      "circle-radius": clusterRadiusExpression,
      "circle-stroke-color": mapTheme.clusterStroke,
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.9,
    },
  },
  {
    id: mapIds.clusterCountLayer,
    type: "symbol",
    source: mapIds.catalogueSource,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": clusterCountSizeExpression,
    },
    paint: {
      "text-color": mapTheme.clusterText,
    },
  },
  {
    id: mapIds.eventsLayer,
    type: "circle",
    source: mapIds.catalogueSource,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        mapTheme.eventHover,
        mapTheme.event,
      ],
      "circle-radius": magnitudeRadiusExpression,
      "circle-stroke-color": mapTheme.eventStroke,
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        2.5,
        1,
      ],
      "circle-opacity": 0.86,
    },
  },
  {
    id: mapIds.selectedHaloLayer,
    type: "circle",
    source: mapIds.selectedSource,
    paint: {
      "circle-color": mapTheme.selectedHalo,
      "circle-opacity": 0.25,
      "circle-radius": ["+", magnitudeRadiusExpression, 9],
      "circle-stroke-color": mapTheme.selected,
      "circle-stroke-opacity": 0.72,
      "circle-stroke-width": 2,
    },
  },
  {
    id: mapIds.selectedEventLayer,
    type: "circle",
    source: mapIds.selectedSource,
    paint: {
      "circle-color": mapTheme.selected,
      "circle-radius": ["+", magnitudeRadiusExpression, 2],
      "circle-stroke-color": mapTheme.selectedStroke,
      "circle-stroke-width": 3,
    },
  },
];

export const placeContextLayers: readonly LayerSpecification[] = [
  {
    id: mapIds.placeContextMarkerLayer,
    type: "circle",
    source: mapIds.placeContextSource,
    paint: {
      "circle-color": mapTheme.placeContext,
      "circle-radius": 7,
      "circle-stroke-color": mapTheme.placeContextStroke,
      "circle-stroke-width": 3,
    },
  },
  {
    id: mapIds.placeContextLabelLayer,
    type: "symbol",
    source: mapIds.placeContextSource,
    layout: {
      "text-field": ["get", "name"],
      "text-anchor": "top",
      "text-offset": [0, 1],
      "text-size": 12,
    },
    paint: {
      "text-color": mapTheme.placeContextText,
      "text-halo-color": mapTheme.background,
      "text-halo-width": 2,
    },
  },
];
