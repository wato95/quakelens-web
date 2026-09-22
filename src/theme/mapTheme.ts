import type { ExpressionSpecification } from "maplibre-gl";

export const mapTheme = {
  background: "#07101a",
  event: "#6874f5",
  eventStroke: "#aab0ff",
  eventHover: "#969cff",
  cluster: "#424cbd",
  clusterStroke: "#b2b7ff",
  clusterText: "#f3f6fa",
  selected: "#f4f6ff",
  selectedStroke: "#7c83f7",
  selectedHalo: "#c2c6ff",
} as const;

export const mapIds = {
  catalogueSource: "earthquake-catalogue",
  selectedSource: "selected-earthquake",
  clustersLayer: "earthquake-clusters",
  clusterCountLayer: "earthquake-cluster-count",
  eventsLayer: "earthquake-events",
  selectedHaloLayer: "selected-earthquake-halo",
  selectedEventLayer: "selected-earthquake-marker",
} as const;

export const magnitudeRadiusExpression: ExpressionSpecification = [
  "step",
  ["get", "magnitude"],
  2.5,
  3,
  4,
  4,
  6,
  5,
  8,
  6,
  11,
  7,
  14,
];

export const clusterRadiusExpression: ExpressionSpecification = [
  "step",
  ["get", "point_count"],
  15,
  100,
  20,
  750,
  26,
];

export const clusterCountSizeExpression: ExpressionSpecification = [
  "step",
  ["get", "point_count"],
  11,
  100,
  12,
  750,
  13,
];
