import { useCallback, useRef, useState } from "react";

import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Surface } from "../ui/Surface";
import { TextInput } from "../ui/TextInput";
import { EventDetailPanel } from "./EventDetailPanel";

export function WorkspaceShell() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    detailTriggerRef.current?.focus();
  }, []);

  return (
    <main className="workspace" id="main-content">
      <section className="workspace-toolbar" aria-label="Earthquake browser controls">
        <div>
          <label className="visually-hidden" htmlFor="event-search">
            Search earthquakes or places
          </label>
          <TextInput
            id="event-search"
            type="search"
            placeholder="Search earthquakes or places"
            disabled
          />
        </div>
        <Button
          ref={detailTriggerRef}
          className="detail-trigger"
          variant="primary"
          aria-controls="event-detail"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen(true)}
        >
          Event details
        </Button>
      </section>

      <Surface className="workspace-map" id="map" aria-labelledby="map-heading">
        <div className="region-heading region-heading--overlay">
          <div>
            <p className="eyebrow">Browse</p>
            <h1 id="map-heading">2026 earthquakes</h1>
          </div>
          <span className="region-status">Map foundation</span>
        </div>
        <div
          className="map-placeholder"
          role="img"
          aria-label="Earthquake map placeholder"
        >
          <span className="map-placeholder__ring" aria-hidden="true" />
          <p>Interactive earthquake map arrives in QLW-003.</p>
        </div>
      </Surface>

      <EventDetailPanel open={detailsOpen} onClose={closeDetails} />

      <Surface
        className="workspace-timeline"
        id="activity"
        aria-labelledby="activity-heading"
      >
        <div className="region-heading">
          <div>
            <p className="eyebrow">UTC</p>
            <h2 id="activity-heading">Daily seismic activity</h2>
          </div>
          <span className="region-status">Timeline foundation</span>
        </div>
        <div className="timeline-placeholder">
          Activity data is introduced in QLW-002; timeline interaction follows in
          QLW-005.
        </div>
      </Surface>

      <Surface className="workspace-table" id="events" aria-labelledby="events-heading">
        <div className="region-heading region-heading--padded">
          <div>
            <p className="eyebrow">Textual results</p>
            <h2 id="events-heading">Earthquake events</h2>
          </div>
        </div>
        <div className="table-placeholder">
          <EmptyState title="Event catalogue not connected">
            Preview event data is introduced in QLW-002. No missing dates are treated as
            zero activity.
          </EmptyState>
        </div>
      </Surface>
    </main>
  );
}
