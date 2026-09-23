import { Button } from "../../components/ui/Button";
import type { EventSortField, EventSummary } from "../../data/types";
import { DEFAULT_EVENT_SORT, type EventSort } from "../../state/browseState";
import { formatDepthKm, formatMagnitude, formatUtcDateTime } from "./eventFormatting";
import styles from "./EventBrowser.module.css";

export const EVENT_RESULTS_PAGE_SIZE = 24;

type EventBrowserProps = {
  events: readonly EventSummary[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  sort?: EventSort;
  page?: number;
  pageSize?: number;
  onSortChange?: (sort: EventSort) => void;
  onPageChange?: (page: number) => void;
};

const COLUMNS: Array<{ field: EventSortField; label: string }> = [
  { field: "eventTime", label: "Event time UTC" },
  { field: "magnitude", label: "Magnitude" },
  { field: "depthKm", label: "Depth (km)" },
  { field: "place", label: "Place" },
  { field: "eventType", label: "Event type" },
  { field: "status", label: "Status" },
];

export function EventBrowser({
  events,
  selectedEventId,
  onSelectEvent,
  sort = DEFAULT_EVENT_SORT,
  page = 1,
  pageSize = EVENT_RESULTS_PAGE_SIZE,
  onSortChange = () => undefined,
  onPageChange = () => undefined,
}: EventBrowserProps) {
  const pageCount = Math.max(1, Math.ceil(events.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleEvents = events.slice(pageStart, pageStart + pageSize);

  function toggleSort(field: EventSortField) {
    onSortChange({
      field,
      direction: sort.field === field && sort.direction === "asc" ? "desc" : "asc",
    });
  }

  return (
    <div className={styles.browser}>
      <div className={styles.header} role="row">
        {COLUMNS.map((column) => {
          const active = sort.field === column.field;
          return (
            <span
              key={column.field}
              role="columnheader"
              aria-sort={
                active
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <button type="button" onClick={() => toggleSort(column.field)}>
                {column.label}
                <span className={styles.sortIndicator} aria-hidden="true">
                  {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                </span>
              </button>
            </span>
          );
        })}
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
                <span className={styles.cell} data-label="Status">
                  {event.status}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {pageCount > 1 ? (
        <nav className={styles.pagination} aria-label="Earthquake result pages">
          <Button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <p aria-live="polite">
            Page {currentPage} of {pageCount} · events {pageStart + 1}–
            {Math.min(pageStart + pageSize, events.length)} of{" "}
            {events.length.toLocaleString("en-GB")}
          </p>
          <Button
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
