import { useCallback, useMemo, useRef, useState } from "react";

import {
  usePreviewEvents,
  type PreviewSessionFactory,
} from "../../app/usePreviewEvents";
import { EarthquakeMap } from "../../features/map/EarthquakeMap";
import { getMapStyleUrl } from "../../features/map/mapConfig";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import { Surface } from "../ui/Surface";
import { TextInput } from "../ui/TextInput";
import { EventDetailPanel } from "./EventDetailPanel";

type WorkspaceShellProps = {
  createSession?: PreviewSessionFactory;
};

export function WorkspaceShell({ createSession }: WorkspaceShellProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const { retry, state } = usePreviewEvents(createSession);
  const events = useMemo(() => (state.status === "ready" ? state.events : []), [state]);
  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    detailTriggerRef.current?.focus();
  }, []);
  const selectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    setDetailsOpen(true);
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
          <span className="region-status">
            {state.status === "ready"
              ? `${state.events.length.toLocaleString()} events`
              : "Preview catalogue"}
          </span>
        </div>
        {state.status === "loading" ? (
          <div className="map-state">
            <LoadingState label="Loading 2026 earthquake preview" />
          </div>
        ) : null}
        {state.status === "error" ? (
          <div className="map-state">
            <ErrorState
              title="Earthquake catalogue unavailable"
              message={state.error.message}
              onRetry={retry}
            />
          </div>
        ) : null}
        {state.status === "ready" && state.events.length === 0 ? (
          <div className="map-state">
            <EmptyState title="No published events">
              The selected preview contains no earthquake events. Missing dates are not
              treated as zero activity.
            </EmptyState>
          </div>
        ) : null}
        {state.status === "ready" && state.events.length > 0 ? (
          <EarthquakeMap
            events={state.events}
            selectedEventId={selectedEventId}
            mapStyleUrl={getMapStyleUrl()}
            onSelectEvent={selectEvent}
          />
        ) : null}
      </Surface>

      <EventDetailPanel
        open={detailsOpen}
        onClose={closeDetails}
        selectedEvent={selectedEvent}
      />

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
