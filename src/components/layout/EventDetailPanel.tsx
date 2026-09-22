import { useEffect, useRef } from "react";

import { Button } from "../ui/Button";
import { UnavailableCapability } from "../ui/UnavailableCapability";

type EventDetailPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function EventDetailPanel({ onClose, open }: EventDetailPanelProps) {
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

        <p className="detail-intro">
          Select an earthquake when the event catalogue becomes available.
        </p>

        <div className="capability-list" aria-label="Preview capability availability">
          <UnavailableCapability title="Tectonic setting" />
          <UnavailableCapability title="Shaking" />
          <UnavailableCapability title="Population exposure" />
        </div>
      </aside>
    </>
  );
}
