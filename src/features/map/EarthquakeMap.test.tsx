import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mapIds } from "../../theme/mapTheme";
import { makeEvent } from "../../test/eventFixture";
import { EarthquakeMap } from "./EarthquakeMap";

const mapFakes = vi.hoisted(() => {
  type Handler = (event?: unknown) => void;
  const handlers = new Map<string, Handler>();
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  const remove = vi.fn();
  const easeTo = vi.fn();
  const jumpTo = vi.fn();
  return { easeTo, handlers, jumpTo, remove, sources };
});

vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url", () => ({
  default: "/map-worker.js",
}));

vi.mock("maplibre-gl", () => {
  class FakeMap {
    constructor() {
      mapFakes.handlers.clear();
      mapFakes.sources.clear();
    }

    addControl() {}

    addSource(id: string) {
      mapFakes.sources.set(id, { setData: vi.fn() });
    }

    addLayer() {}

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
