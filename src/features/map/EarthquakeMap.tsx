import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useMemo, useRef, useState } from "react";

import type { EventSummary, PlaceSearchResult } from "../../data/types";
import { mapIds } from "../../theme/mapTheme";
import {
  eventsToFeatureCollection,
  selectedEventFeatureCollection,
  type EarthquakeFeatureCollection,
} from "./earthquakeGeoJson";
import { earthquakeLayers, placeContextLayers } from "./mapLayers";

setWorkerUrl(mapWorkerUrl);

type EarthquakeMapProps = {
  events: readonly EventSummary[];
  selectedEventId: string | null;
  mapStyleUrl: string;
  onSelectEvent: (eventId: string) => void;
  placeContext?: PlaceSearchResult | null;
};

type MapState = "loading" | "ready" | "error";

const EMPTY_COLLECTION: EarthquakeFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function EarthquakeMap({
  events,
  mapStyleUrl,
  onSelectEvent,
  placeContext = null,
  selectedEventId,
}: EarthquakeMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const catalogueRef = useRef<EarthquakeFeatureCollection>(EMPTY_COLLECTION);
  const selectedRef = useRef<EarthquakeFeatureCollection>(EMPTY_COLLECTION);
  const placeContextRef = useRef(placeContext);
  const selectRef = useRef(onSelectEvent);
  const hoveredEventIdRef = useRef<string | number | null>(null);
  const [mapState, setMapState] = useState<MapState>("loading");
  const [mapError, setMapError] = useState("The map could not be rendered.");

  const preparedCatalogue = useMemo(() => {
    try {
      return { collection: eventsToFeatureCollection(events), error: null };
    } catch (error) {
      return {
        collection: EMPTY_COLLECTION,
        error: error instanceof Error ? error.message : "Invalid earthquake geometry",
      };
    }
  }, [events]);
  const catalogue = preparedCatalogue.collection;
  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const selected = useMemo(
    () => selectedEventFeatureCollection(selectedEvent),
    [selectedEvent],
  );
  const placeCollection = useMemo(
    () => placeToFeatureCollection(placeContext),
    [placeContext],
  );

  useEffect(() => {
    catalogueRef.current = catalogue;
  }, [catalogue]);

  useEffect(() => {
    selectRef.current = onSelectEvent;
  }, [onSelectEvent]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    placeContextRef.current = placeContext;
  }, [placeContext]);

  useEffect(() => {
    if (!hostRef.current || preparedCatalogue.error) return;

    let loaded = false;
    const map = new MapLibreMap({
      container: hostRef.current,
      style: mapStyleUrl,
      center: [0, 18],
      zoom: 1.2,
      minZoom: 0.6,
      attributionControl: { compact: false },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    const setPointerCursor = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointerCursor = () => {
      map.getCanvas().style.cursor = "";
    };
    const selectPoint = (event: MapLayerMouseEvent) => {
      const eventId = event.features?.[0]?.properties.eventId;
      if (typeof eventId === "string") selectRef.current(eventId);
    };
    const expandCluster = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties.cluster_id;
      if (typeof clusterId !== "number" || feature?.geometry.type !== "Point") {
        return;
      }
      const source = map.getSource(mapIds.catalogueSource) as GeoJSONSource | undefined;
      if (!source) return;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      const camera = { center: feature.geometry.coordinates as [number, number], zoom };
      if (prefersReducedMotion()) {
        map.jumpTo(camera);
      } else {
        map.easeTo(camera);
      }
    };
    const setHoveredPoint = (event: MapLayerMouseEvent) => {
      setPointerCursor();
      const featureId = event.features?.[0]?.id;
      if (featureId === undefined || featureId === null) return;
      if (hoveredEventIdRef.current !== null) {
        map.setFeatureState(
          { source: mapIds.catalogueSource, id: hoveredEventIdRef.current },
          { hover: false },
        );
      }
      hoveredEventIdRef.current = featureId;
      map.setFeatureState(
        { source: mapIds.catalogueSource, id: featureId },
        { hover: true },
      );
    };
    const clearHoveredPoint = () => {
      clearPointerCursor();
      if (hoveredEventIdRef.current === null) return;
      map.setFeatureState(
        { source: mapIds.catalogueSource, id: hoveredEventIdRef.current },
        { hover: false },
      );
      hoveredEventIdRef.current = null;
    };

    map.on("load", () => {
      loaded = true;
      map.addSource(mapIds.catalogueSource, {
        type: "geojson",
        data: catalogueRef.current,
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 48,
      });
      map.addSource(mapIds.selectedSource, {
        type: "geojson",
        data: selectedRef.current,
      });
      map.addSource(mapIds.placeContextSource, {
        type: "geojson",
        data: placeToFeatureCollection(placeContextRef.current),
      });
      for (const layer of earthquakeLayers) map.addLayer(layer);
      for (const layer of placeContextLayers) map.addLayer(layer);

      const initialPlace = placeContextRef.current;
      if (initialPlace) {
        map.jumpTo({
          center: [initialPlace.longitude, initialPlace.latitude],
          zoom: 8,
        });
      }

      map.on("click", mapIds.clustersLayer, expandCluster);
      map.on("click", mapIds.eventsLayer, selectPoint);
      map.on("click", mapIds.selectedEventLayer, selectPoint);
      map.on("mouseenter", mapIds.clustersLayer, setPointerCursor);
      map.on("mouseleave", mapIds.clustersLayer, clearPointerCursor);
      map.on("mousemove", mapIds.eventsLayer, setHoveredPoint);
      map.on("mouseleave", mapIds.eventsLayer, clearHoveredPoint);
      setMapState("ready");
    });

    map.on("error", (event) => {
      if (loaded) return;
      setMapError(event.error?.message || "The basemap style could not be loaded.");
      setMapState("error");
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapStyleUrl, preparedCatalogue.error]);

  useEffect(() => {
    const source = mapRef.current?.getSource(mapIds.catalogueSource) as
      GeoJSONSource | undefined;
    source?.setData(catalogue);
  }, [catalogue]);

  useEffect(() => {
    const source = mapRef.current?.getSource(mapIds.selectedSource) as
      GeoJSONSource | undefined;
    source?.setData(selected);
  }, [selected]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(mapIds.placeContextSource) as
      GeoJSONSource | undefined;
    source?.setData(placeCollection);
    if (!map || !placeContext || !source) return;
    const camera = {
      center: [placeContext.longitude, placeContext.latitude] as [number, number],
      zoom: 8,
    };
    if (prefersReducedMotion()) {
      map.jumpTo(camera);
    } else {
      map.easeTo(camera);
    }
  }, [placeCollection, placeContext]);

  return (
    <div
      className="earthquake-map"
      data-map-state={preparedCatalogue.error ? "error" : mapState}
      data-event-count={events.length}
    >
      <div
        ref={hostRef}
        className="earthquake-map__canvas"
        role="region"
        aria-label={`Interactive earthquake map with ${events.length.toLocaleString()} events`}
      />
      {mapState === "loading" && !preparedCatalogue.error ? (
        <div className="map-message" role="status">
          Loading map…
        </div>
      ) : null}
      {mapState === "error" || preparedCatalogue.error ? (
        <div className="map-message map-message--error" role="alert">
          <strong>Map unavailable</strong>
          <span>{preparedCatalogue.error ?? mapError}</span>
        </div>
      ) : null}
      <div className="map-overlay-card map-legend" aria-label="Earthquake map legend">
        <p className="map-legend__title">Earthquakes</p>
        <div className="map-legend__row">
          <span className="map-legend__dot map-legend__dot--small" aria-hidden="true" />
          <span>Lower magnitude</span>
        </div>
        <div className="map-legend__row">
          <span className="map-legend__dot map-legend__dot--large" aria-hidden="true" />
          <span>Higher magnitude</span>
        </div>
        <div className="map-legend__row">
          <span
            className="map-legend__dot map-legend__dot--selected"
            aria-hidden="true"
          />
          <span>Selected event</span>
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {selectedEvent
          ? `Selected magnitude ${selectedEvent.magnitude.toFixed(1)} earthquake, ${selectedEvent.placeDescription}`
          : "No earthquake selected"}
      </p>
      {placeContext ? (
        <p className="visually-hidden" aria-live="polite">
          Map centred on U.S. Census place {placeContext.name},{" "}
          {placeContext.admin1Name}.
        </p>
      ) : null}
    </div>
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function placeToFeatureCollection(place: PlaceSearchResult | null) {
  return {
    type: "FeatureCollection" as const,
    features: place
      ? [
          {
            type: "Feature" as const,
            id: place.placeId,
            geometry: {
              type: "Point" as const,
              coordinates: [place.longitude, place.latitude],
            },
            properties: { name: place.name },
          },
        ]
      : [],
  };
}
