import { useEffect, useRef } from "react";

import type { EventSummary } from "../../data/types";
import { Button } from "../ui/Button";
import { UnavailableCapability } from "../ui/UnavailableCapability";

type EventDetailPanelProps = {
  open: boolean;
  onClose: () => void;
  selectedEvent: EventSummary | null;
};

const utcDateTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

export function EventDetailPanel({
  onClose,
  open,
  selectedEvent,
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
          <section className="selected-event-summary" aria-label="Selected earthquake">
            <p className="detail-magnitude">M {selectedEvent.magnitude.toFixed(1)}</p>
            <p className="detail-place">{selectedEvent.placeDescription}</p>
            <p className="detail-meta">
              <time dateTime={selectedEvent.eventTime}>
                {utcDateTime.format(new Date(selectedEvent.eventTime))} UTC
              </time>
            </p>
            <p className="detail-event-id mono">{selectedEvent.eventId}</p>
          </section>
        ) : (
          <p className="detail-intro">
            Select an earthquake on the map to see its published summary.
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
