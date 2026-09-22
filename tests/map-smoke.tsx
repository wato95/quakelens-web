import "maplibre-gl/dist/maplibre-gl.css";
import "../src/styles/tokens.css";
import "../src/styles/theme.css";
import "../src/styles/globals.css";
import "../src/styles/layout.css";
import "../src/styles/map.css";

import { useState } from "react";
import { createRoot } from "react-dom/client";

import { EarthquakeMap } from "../src/features/map/EarthquakeMap";
import { makeEvent } from "../src/test/eventFixture";

const events = [
  makeEvent({
    eventId: "map-center",
    longitude: 0,
    latitude: 18,
    placeDescription: "Map center test event",
  }),
  makeEvent({ eventId: "map-west", longitude: -0.08, latitude: 18 }),
  makeEvent({ eventId: "map-east", longitude: 0.08, latitude: 18 }),
];

export function MapSmoke() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <main style={{ width: "100vw", height: "100vh", padding: "16px" }}>
      <div
        className="workspace-map surface-panel"
        style={{ width: "100%", height: "100%" }}
      >
        <EarthquakeMap
          events={events}
          selectedEventId={selectedEventId}
          mapStyleUrl="/tests/fixtures/map/style.json"
          onSelectEvent={setSelectedEventId}
        />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<MapSmoke />);
