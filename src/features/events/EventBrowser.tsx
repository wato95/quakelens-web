import { useState } from "react";

import { Button } from "../../components/ui/Button";
import type { EventSummary } from "../../data/types";
import { formatDepthKm, formatMagnitude, formatUtcDateTime } from "./eventFormatting";
import styles from "./EventBrowser.module.css";

const DEFAULT_PAGE_SIZE = 100;

type EventBrowserProps = {
  events: readonly EventSummary[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  pageSize?: number;
};

type PageState = {
  page: number;
  selectedEventId: string | null;
};

export function EventBrowser({
  events,
  selectedEventId,
  onSelectEvent,
  pageSize = DEFAULT_PAGE_SIZE,
}: EventBrowserProps) {
  const [pageState, setPageState] = useState<PageState>({
    page: 0,
    selectedEventId: null,
  });
  const pageCount = Math.max(1, Math.ceil(events.length / pageSize));
  const selectedIndex = selectedEventId
    ? events.findIndex((event) => event.eventId === selectedEventId)
    : -1;
  const selectedPage = selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) : null;
  const requestedPage =
    selectedEventId !== pageState.selectedEventId && selectedPage !== null
      ? selectedPage
      : pageState.page;
  const page = Math.min(requestedPage, pageCount - 1);
  const pageStart = page * pageSize;
  const visibleEvents = events.slice(pageStart, pageStart + pageSize);

  const goToPage = (nextPage: number) => {
    setPageState({ page: nextPage, selectedEventId });
  };

  return (
    <div className={styles.browser}>
      <div className={styles.header} aria-hidden="true">
        <span>Event time UTC</span>
        <span>Magnitude</span>
        <span>Depth</span>
        <span>Place</span>
        <span>Event type</span>
        <span>Source status</span>
      </div>
      <ol
        className={styles.results}
        aria-label={`Earthquake results, ${events.length.toLocaleString("en-GB")} events`}
        start={pageStart + 1}
      >
        {visibleEvents.map((event) => {
          const selected = event.eventId === selectedEventId;
          return (
            <li className={styles.result} key={event.eventId}>
              <button
                className={styles.row}
                type="button"
                aria-pressed={selected}
                aria-label={`${selected ? "Selected: " : ""}magnitude ${formatMagnitude(event.magnitude)} ${event.magnitudeType} earthquake, ${event.placeDescription}, ${formatUtcDateTime(event.eventTime)}`}
                onClick={() => onSelectEvent(event.eventId)}
              >
                <span className={styles.cell} data-label="Event time UTC">
                  <time dateTime={event.eventTime}>
                    {formatUtcDateTime(event.eventTime)}
                  </time>
                </span>
                <span
                  className={`${styles.cell} ${styles.magnitude}`}
                  data-label="Magnitude"
                >
                  {formatMagnitude(event.magnitude)} {event.magnitudeType}
                </span>
                <span className={styles.cell} data-label="Depth">
                  {formatDepthKm(event.depthKm)}
                </span>
                <span className={`${styles.cell} ${styles.place}`} data-label="Place">
                  {event.placeDescription}
                </span>
                <span className={styles.cell} data-label="Event type">
                  {event.eventType}
                </span>
                <span className={styles.cell} data-label="Source status">
                  {event.status} / {event.reviewStatus}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {pageCount > 1 ? (
        <nav className={styles.pagination} aria-label="Earthquake result pages">
          <p aria-live="polite">
            Page {page + 1} of {pageCount} · events {pageStart + 1}–
            {Math.min(pageStart + pageSize, events.length)} of{" "}
            {events.length.toLocaleString("en-GB")}
          </p>
          <div className={styles.paginationActions}>
            <Button disabled={page === 0} onClick={() => goToPage(page - 1)}>
              Previous
            </Button>
            <Button
              disabled={page === pageCount - 1}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
