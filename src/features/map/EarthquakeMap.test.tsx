import { webcrypto } from "node:crypto";
import userEvent from "@testing-library/user-event";
import { tectonicManifest } from "../../test/tectonicFixture";
import boundaryJson from "../../../tests/fixtures/tectonic-preview/references/tectonic_plate_boundaries.geojson?raw";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapIds } from "../../theme/mapTheme";
import { makeEvent } from "../../test/eventFixture";
import { EarthquakeMap } from "./EarthquakeMap";

const mapFakes = vi.hoisted(() => {
  type Handler = (event?: unknown) => void;
  const handlers = new Map<string, Handler>();
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  const layers = new Map<string, unknown>();
  const addLayer = vi.fn();
  const setLayoutProperty = vi.fn();
  const remove = vi.fn();
  const easeTo = vi.fn();
  const jumpTo = vi.fn();
  const constructorOptions = vi.fn();
  return {
    layers,
    addLayer,
    setLayoutProperty,
    constructorOptions,
    easeTo,
    handlers,
    jumpTo,
    remove,
    sources,
  };
});

vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url", () => ({
  default: "/map-worker.js",
}));

vi.mock("maplibre-gl", () => {
  class FakeMap {
    constructor(options: unknown) {
      mapFakes.handlers.clear();
      mapFakes.sources.clear();
      mapFakes.layers.clear();
      mapFakes.constructorOptions(options);
    }

    addControl() {}

    addSource(id: string) {
      mapFakes.sources.set(id, { setData: vi.fn() });
    }

    addLayer(layer: { id: string }, before?: string) {
      mapFakes.layers.set(layer.id, layer);
      mapFakes.addLayer(layer, before);
    }
    getLayer(id: string) {
      return mapFakes.layers.get(id);
    }
    removeLayer(id: string) {
      mapFakes.layers.delete(id);
    }
    removeSource(id: string) {
      mapFakes.sources.delete(id);
    }
    setLayoutProperty = mapFakes.setLayoutProperty;

    getSource(id: string) {
      return mapFakes.sources.get(id);
    }

    getCanvas() {
      return { style: { cursor: "" } };
    }

    setFeatureState() {}

    easeTo = mapFakes.easeTo;

    jumpTo = mapFakes.jumpTo;

    on(
      event: string,
      layerOrHandler: string | ((event?: unknown) => void),
      handler?: (event?: unknown) => void,
    ) {
      const key =
        typeof layerOrHandler === "string" ? `${event}:${layerOrHandler}` : event;
      const callback = typeof layerOrHandler === "function" ? layerOrHandler : handler;
      if (callback) mapFakes.handlers.set(key, callback);
      if (event === "load" && callback) queueMicrotask(() => callback());
    }

    remove = mapFakes.remove;
  }

  return {
    Map: FakeMap,
    NavigationControl: class {},
    setWorkerUrl: vi.fn(),
  };
});

describe("EarthquakeMap", () => {
  beforeEach(() => {
    mapFakes.remove.mockClear();
    mapFakes.easeTo.mockClear();
    mapFakes.jumpTo.mockClear();
    mapFakes.constructorOptions.mockClear();
  });

  it("creates the catalogue once, reports readiness and forwards point selection", async () => {
    const onSelectEvent = vi.fn();
    const event = makeEvent();
    const view = render(
      <EarthquakeMap
        events={[event]}
        selectedEventId={null}
        mapStyleUrl="/map/style.json"
        onSelectEvent={onSelectEvent}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText(/interactive earthquake map/i).parentElement,
      ).toHaveAttribute("data-map-state", "ready"),
    );
    expect(mapFakes.sources.has(mapIds.catalogueSource)).toBe(true);
    expect(mapFakes.sources.has(mapIds.selectedSource)).toBe(true);
    expect(mapFakes.constructorOptions).toHaveBeenCalledWith(
      expect.objectContaining({ renderWorldCopies: false }),
    );

    mapFakes.handlers.get(`click:${mapIds.eventsLayer}`)?.({
      features: [{ properties: { eventId: event.eventId } }],
    });
    expect(onSelectEvent).toHaveBeenCalledWith(event.eventId);

    view.rerender(
      <EarthquakeMap
        events={[event]}
        selectedEventId={event.eventId}
        mapStyleUrl="/map/style.json"
        onSelectEvent={onSelectEvent}
      />,
    );
    expect(
      mapFakes.sources.get(mapIds.selectedSource)?.setData,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        features: [expect.objectContaining({ id: event.eventId })],
      }),
    );

    view.unmount();
    expect(mapFakes.remove).toHaveBeenCalledOnce();
  });

  it("renders and navigates to explicitly selected Census place context", async () => {
    const view = render(
      <EarthquakeMap
        events={[makeEvent()]}
        selectedEventId={null}
        mapStyleUrl="/map/style.json"
        onSelectEvent={vi.fn()}
        placeContext={null}
      />,
    );
    await waitFor(() =>
      expect(mapFakes.sources.has(mapIds.placeContextSource)).toBe(true),
    );

    view.rerender(
      <EarthquakeMap
        events={[makeEvent()]}
        selectedEventId={null}
        mapStyleUrl="/map/style.json"
        onSelectEvent={vi.fn()}
        placeContext={{
          placeId: "paris-tx",
          name: "Paris",
          placeType: "incorporated place",
          countryCode: "US",
          admin1Code: "48",
          admin1Name: "Texas",
          latitude: 33.66,
          longitude: -95.55,
          populationContext: null,
          populationYear: null,
          populationSourceId: null,
          sourceId: "census",
          sourceVintage: "2024",
        }}
      />,
    );

    expect(mapFakes.sources.get(mapIds.placeContextSource)?.setData).toHaveBeenCalled();
    expect(mapFakes.easeTo).toHaveBeenCalledWith({ center: [-95.55, 33.66], zoom: 8 });
    expect(
      screen.getByText(/map centred on U\.S\. Census place Paris, Texas/i),
    ).toBeInTheDocument();
  });
});

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
  mapFakes.addLayer.mockClear();
  mapFakes.setLayoutProperty.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("plate boundaries in earthquake map", () => {
  it("inserts a subordinate line source and toggles only its visibility", async () => {
    const fetcher = vi.fn(async () => new Response(boundaryJson));
    vi.stubGlobal("fetch", fetcher);
    const props = {
      events: [makeEvent()],
      selectedEventId: "us-test",
      mapStyleUrl: "/style.json",
      onSelectEvent: vi.fn(),
      manifest: tectonicManifest,
    };
    const view = render(<EarthquakeMap {...props} />);
    await waitFor(() =>
      expect(mapFakes.layers.has(mapIds.plateBoundaryLayer)).toBe(true),
    );
    expect(mapFakes.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mapIds.plateBoundaryLayer,
        type: "line",
        source: mapIds.plateBoundarySource,
      }),
      mapIds.clustersLayer,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Plate boundaries" });
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(mapFakes.setLayoutProperty).toHaveBeenLastCalledWith(
      mapIds.plateBoundaryLayer,
      "visibility",
      "none",
    );
    expect(sessionStorage.getItem("quakelens.plateBoundaries")).toBe("hidden");
    expect(screen.queryByText("PB2002 source and licence")).not.toBeInTheDocument();
    view.rerender(<EarthquakeMap {...props} events={[makeEvent({ magnitude: 7 })]} />);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mapFakes.sources.has(mapIds.catalogueSource)).toBe(true);
  });
  it("keeps event browsing available on boundary failure and supports retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockImplementation(async () => new Response(boundaryJson)),
    );
    const view = render(
      <EarthquakeMap
        events={[makeEvent()]}
        selectedEventId={null}
        mapStyleUrl="/style.json"
        onSelectEvent={vi.fn()}
        manifest={tectonicManifest}
      />,
    );
    expect(await screen.findByText("Plate boundaries unavailable")).toBeInTheDocument();
    expect(
      view.container.querySelector('[data-map-state="ready"]'),
    ).toBeInTheDocument();
    expect(mapFakes.sources.has(mapIds.catalogueSource)).toBe(true);
    expect(screen.queryByText("Map unavailable")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Retry plate boundaries" }),
    );
    await waitFor(() =>
      expect(mapFakes.layers.has(mapIds.plateBoundaryLayer)).toBe(true),
    );
  });
  it("does not fetch boundary data for original V1 manifests", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(
      <EarthquakeMap
        events={[makeEvent()]}
        selectedEventId={null}
        mapStyleUrl="/style.json"
        onSelectEvent={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(mapFakes.sources.has(mapIds.catalogueSource)).toBe(true),
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("checkbox", { name: "Plate boundaries" }),
    ).not.toBeInTheDocument();
  });
});

it("isolates MapLibre boundary-source errors after registration", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(boundaryJson)),
  );
  const view = render(
    <EarthquakeMap
      events={[makeEvent()]}
      selectedEventId={null}
      mapStyleUrl="/style.json"
      onSelectEvent={vi.fn()}
      manifest={tectonicManifest}
    />,
  );
  await waitFor(() =>
    expect(mapFakes.layers.has(mapIds.plateBoundaryLayer)).toBe(true),
  );
  act(() =>
    mapFakes.handlers.get("error")?.({
      sourceId: mapIds.plateBoundarySource,
      error: new Error("worker source failure"),
    }),
  );
  expect(screen.getByText("Plate boundaries unavailable")).toBeInTheDocument();
  expect(view.container.querySelector('[data-map-state="ready"]')).toBeInTheDocument();
});
