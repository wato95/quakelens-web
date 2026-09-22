import { useEffect, useRef } from "react";

import type {
  CapturedEventState,
  EventSummary,
  PreviewManifest,
} from "../../data/types";
import {
  formatCapturedStates,
  formatCoordinates,
  formatDepthKm,
  formatMagnitude,
  formatUtcDateTime,
} from "../../features/events/eventFormatting";
import { CapturedHistory } from "../../features/revisions/CapturedHistory";
import { Button } from "../ui/Button";
import { UnavailableCapability } from "../ui/UnavailableCapability";

type EventDetailPanelProps = {
  open: boolean;
  onClose: () => void;
  selectedEvent: EventSummary | null;
  manifest: PreviewManifest | null;
  loadCapturedHistory: (eventId: string) => Promise<CapturedEventState[]>;
};

export function EventDetailPanel({
  onClose,
  open,
  selectedEvent,
  manifest,
  loadCapturedHistory,
}: EventDetailPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  const source = selectedEvent
    ? manifest?.sources.find((entry) => entry.sourceId === selectedEvent.sourceId)
    : undefined;
  const licence = selectedEvent
    ? manifest?.licences.find((entry) => entry.licenceId === selectedEvent.licenceId)
    : undefined;

  return (
    <>
      <button
        className="detail-backdrop"
        type="button"
        aria-label="Close event details"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        data-open={open}
      />
      <aside
        className="workspace-detail surface-panel"
        id="event-detail"
        aria-labelledby="event-detail-heading"
        data-open={open}
      >
        <div className="detail-heading-row">
          <div>
            <p className="eyebrow">Selected event</p>
            <h2 id="event-detail-heading">Event detail</h2>
          </div>
          <Button
            ref={closeButtonRef}
            className="detail-close"
            aria-label="Close event details"
            onClick={onClose}
          >
            Close
          </Button>
        </div>

        {selectedEvent ? (
          <>
            <section
              className="selected-event-summary"
              aria-label="Selected earthquake"
            >
              <p className="detail-magnitude">
                M {formatMagnitude(selectedEvent.magnitude)}{" "}
                <span>{selectedEvent.magnitudeType}</span>
              </p>
              <p className="detail-place">{selectedEvent.placeDescription}</p>
              <p className="detail-meta">
                Event time:{" "}
                <time dateTime={selectedEvent.eventTime}>
                  {formatUtcDateTime(selectedEvent.eventTime)}
                </time>
              </p>
            </section>

            <section
              className="detail-section"
              aria-labelledby="event-properties-heading"
            >
              <h3 id="event-properties-heading">Published event properties</h3>
              <dl className="key-value-list">
                <dt>Source updated</dt>
                <dd>
                  <time dateTime={selectedEvent.sourceUpdatedAt}>
                    {formatUtcDateTime(selectedEvent.sourceUpdatedAt)}
                  </time>
                </dd>
                <dt>Depth</dt>
                <dd>{formatDepthKm(selectedEvent.depthKm)}</dd>
                <dt>Coordinates</dt>
                <dd>
                  {formatCoordinates(selectedEvent.latitude, selectedEvent.longitude)}
                </dd>
                <dt>Event type</dt>
                <dd>{selectedEvent.eventType}</dd>
                <dt>Source status</dt>
                <dd>{selectedEvent.status}</dd>
                <dt>Review status</dt>
                <dd>{selectedEvent.reviewStatus}</dd>
                <dt>Captured history</dt>
                <dd>{formatCapturedStates(selectedEvent.capturedStateCount)}</dd>
              </dl>
            </section>

            <CapturedHistory
              key={selectedEvent.eventId}
              eventId={selectedEvent.eventId}
              expectedStateCount={selectedEvent.capturedStateCount}
              loadCapturedHistory={loadCapturedHistory}
            />

            <section className="detail-section" aria-labelledby="event-source-heading">
              <h3 id="event-source-heading">Source and licence</h3>
              <dl className="key-value-list">
                <dt>Source</dt>
                <dd>
                  {source ? (
                    <a href={source.sourceUrl} rel="noreferrer" target="_blank">
                      {source.attribution}
                    </a>
                  ) : (
                    selectedEvent.sourceId
                  )}
                </dd>
                <dt>Source ID</dt>
                <dd className="mono">{selectedEvent.sourceId}</dd>
                <dt>Licence</dt>
                <dd>
                  {licence ? (
                    <a href={licence.licenceUrl} rel="noreferrer" target="_blank">
                      {licence.name}
                    </a>
                  ) : (
                    selectedEvent.licenceId
                  )}
                </dd>
                <dt>Event ID</dt>
                <dd className="mono">{selectedEvent.eventId}</dd>
                <dt>Revision ID</dt>
                <dd className="mono">{selectedEvent.eventRevisionId}</dd>
              </dl>
            </section>
          </>
        ) : (
          <p className="detail-intro">
            Select an earthquake on the map or in the event results to see its published
            summary.
          </p>
        )}

        <div className="capability-list" aria-label="Preview capability availability">
          <UnavailableCapability title="Tectonic setting" />
          <UnavailableCapability title="Shaking" />
          <UnavailableCapability title="Population exposure" />
        </div>
      </aside>
    </>
  );
}
