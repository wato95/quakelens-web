import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  resolveTimeRangeSelection,
  timeWindowContains,
  type TimeRangeSelection,
} from "../../app/timeRange";
import {
  usePreviewEvents,
  type PreviewSessionFactory,
} from "../../app/usePreviewEvents";
import { EarthquakeMap } from "../../features/map/EarthquakeMap";
import { getMapStyleUrl } from "../../features/map/mapConfig";
import {
  EVENT_RESULTS_PAGE_SIZE,
  EventBrowser,
} from "../../features/events/EventBrowser";
import { MagnitudeQuickFilters } from "../../features/map/MagnitudeQuickFilters";
import { DailyActivityTimeline } from "../../features/timeline/DailyActivityTimeline";
import {
  DEFAULT_BROWSE_STATE,
  DEFAULT_BROWSE_FILTERS,
  DEFAULT_EVENT_SORT,
  DEFAULT_RESULT_PAGE,
  applyMagnitudeQuickFilter,
  describeActiveFilters,
  type BrowseFilters as BrowseFiltersState,
  type BrowseState,
  type EventSort,
  type MagnitudeQuickFilter,
} from "../../state/browseState";
import { parseUrlState, serializeUrlState } from "../../state/urlState";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import { Surface } from "../ui/Surface";
import { BrowseToolbar } from "./BrowseToolbar";
import { EventDetailPanel } from "./EventDetailPanel";

type WorkspaceShellProps = {
  createSession?: PreviewSessionFactory;
};

export function WorkspaceShell({ createSession }: WorkspaceShellProps) {
  const [initialUrlState] = useState(() =>
    typeof window === "undefined"
      ? DEFAULT_BROWSE_STATE
      : parseUrlState(window.location.search),
  );
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(initialUrlState.selectedEventId),
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialUrlState.selectedEventId,
  );
  const [page, setPage] = useState(initialUrlState.page);
  const [shareStatus, setShareStatus] = useState("");
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const { loadCapturedHistory, retry, setFilters, setSort, state } = usePreviewEvents(
    createSession,
    initialUrlState.filters,
    initialUrlState.sort,
  );
  const events = useMemo(() => (state.status === "ready" ? state.events : []), [state]);
  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const selectionIsOutsideResults =
    state.status === "ready" &&
    !state.isUpdatingTimeWindow &&
    selectedEventId !== null &&
    selectedEvent === null;
  const effectiveSelectedEventId = selectionIsOutsideResults ? null : selectedEventId;
  const effectiveDetailsOpen = detailsOpen && !selectionIsOutsideResults;
  const activeSort = state.status === "ready" ? state.sort : initialUrlState.sort;
  const pageCount = Math.max(1, Math.ceil(events.length / EVENT_RESULTS_PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount);
  const activeFilterDescriptions =
    state.status === "ready" ? describeActiveFilters(state.filters) : [];

  const updateUrl = useCallback((nextState: BrowseState, mode: "push" | "replace") => {
    const nextUrl = `${window.location.pathname}${serializeUrlState(nextState)}${window.location.hash}`;
    window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", nextUrl);
  }, []);

  useEffect(() => {
    const restoreUrlState = () => {
      const restored = parseUrlState(window.location.search);
      setSelectedEventId(restored.selectedEventId);
      setDetailsOpen(Boolean(restored.selectedEventId));
      setPage(restored.page);
      setFilters(restored.filters, restored.sort);
    };
    window.addEventListener("popstate", restoreUrlState);
    return () => window.removeEventListener("popstate", restoreUrlState);
  }, [setFilters]);

  useEffect(() => {
    if (state.status !== "ready" || state.isUpdatingTimeWindow) return;
    const selectionExists =
      selectedEventId === null ||
      state.events.some((event) => event.eventId === selectedEventId);
    const normalizedSelection = selectionExists ? selectedEventId : null;
    const normalizedPage = Math.min(page, pageCount);
    updateUrl(
      {
        filters: state.filters,
        selectedEventId: normalizedSelection,
        sort: state.sort,
        page: normalizedPage,
      },
      "replace",
    );
  }, [page, pageCount, selectedEventId, state, updateUrl]);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    detailTriggerRef.current?.focus();
  }, []);
  const selectEvent = useCallback(
    (eventId: string) => {
      setSelectedEventId(eventId);
      setDetailsOpen(true);
      if (state.status === "ready") {
        const eventIndex = state.events.findIndex((event) => event.eventId === eventId);
        const selectedPage =
          eventIndex < 0
            ? effectivePage
            : Math.floor(eventIndex / EVENT_RESULTS_PAGE_SIZE) + 1;
        setPage(selectedPage);
        updateUrl(
          {
            filters: state.filters,
            selectedEventId: eventId,
            sort: state.sort,
            page: selectedPage,
          },
          "push",
        );
      }
    },
    [effectivePage, state, updateUrl],
  );
  const applyFilters = useCallback(
    (filters: BrowseFiltersState) => {
      setPage(DEFAULT_RESULT_PAGE);
      setFilters(filters);
      if (state.status === "ready") {
        updateUrl(
          {
            filters,
            selectedEventId,
            sort: state.sort,
            page: DEFAULT_RESULT_PAGE,
          },
          "push",
        );
      }
    },
    [selectedEventId, setFilters, state, updateUrl],
  );
  const resetFilters = useCallback(() => {
    setSelectedEventId(null);
    setDetailsOpen(false);
    setPage(DEFAULT_RESULT_PAGE);
    setFilters(DEFAULT_BROWSE_FILTERS, DEFAULT_EVENT_SORT);
    updateUrl(DEFAULT_BROWSE_STATE, "push");
  }, [setFilters, updateUrl]);

  const searchEvents = useCallback(
    (placeQuery: string) => {
      if (state.status !== "ready") return;
      applyFilters({ ...state.filters, placeQuery });
    },
    [applyFilters, state],
  );

  const changeMagnitudeQuickFilter = useCallback(
    (quickFilter: MagnitudeQuickFilter) => {
      if (state.status !== "ready") return;
      applyFilters(applyMagnitudeQuickFilter(state.filters, quickFilter));
    },
    [applyFilters, state],
  );

  const changeSort = useCallback(
    (sort: EventSort) => {
      if (state.status !== "ready") return;
      setPage(DEFAULT_RESULT_PAGE);
      setSort(sort);
      updateUrl(
        {
          filters: state.filters,
          selectedEventId,
          sort,
          page: DEFAULT_RESULT_PAGE,
        },
        "push",
      );
    },
    [selectedEventId, setSort, state, updateUrl],
  );

  const changePage = useCallback(
    (nextPage: number) => {
      if (state.status !== "ready") return;
      const normalizedPage = Math.min(Math.max(1, nextPage), pageCount);
      setPage(normalizedPage);
      updateUrl(
        {
          filters: state.filters,
          selectedEventId,
          sort: state.sort,
          page: normalizedPage,
        },
        "push",
      );
    },
    [pageCount, selectedEventId, state, updateUrl],
  );
  const changeTimeRange = useCallback(
    (selection: TimeRangeSelection) => {
      if (state.status !== "ready") return;
      const { timeWindow: nextWindow } = resolveTimeRangeSelection(
        state.manifest.includedCoverage,
        selection,
      );
      if (selectedEvent && !timeWindowContains(nextWindow, selectedEvent.eventTime)) {
        setSelectedEventId(null);
        setDetailsOpen(false);
      }
      const nextFilters = { ...state.filters, timeRange: selection };
      setPage(DEFAULT_RESULT_PAGE);
      setFilters(nextFilters);
      updateUrl(
        {
          filters: nextFilters,
          selectedEventId:
            selectedEvent && timeWindowContains(nextWindow, selectedEvent.eventTime)
              ? selectedEventId
              : null,
          sort: state.sort,
          page: DEFAULT_RESULT_PAGE,
        },
        "push",
      );
    },
    [selectedEvent, selectedEventId, setFilters, state, updateUrl],
  );

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("Share link copied");
    } catch {
      setShareStatus("Copy unavailable; use the address bar to share this view");
    }
  }, []);

  return (
    <main className="workspace" id="main-content">
      <section className="workspace-toolbar" aria-label="Earthquake browser controls">
        {state.status === "ready" ? (
          <Surface className="browse-controls">
            <BrowseToolbar
              filters={state.filters}
              isUpdating={state.isUpdatingTimeWindow}
              shareStatus={shareStatus}
              onApplyFilters={applyFilters}
              onResetFilters={resetFilters}
              onSearch={searchEvents}
              onTimeRangeChange={changeTimeRange}
              onCopyLink={() => void copyShareLink()}
            />
          </Surface>
        ) : (
          <Surface className="browse-controls">
            <LoadingState label="Loading search and filters" />
          </Surface>
        )}
      </section>

      <Surface className="workspace-map" id="map" aria-labelledby="map-heading">
        <div className="region-heading region-heading--overlay">
          <div>
            <p className="eyebrow">Browse</p>
            <h1 id="map-heading">2026 earthquakes</h1>
          </div>
          <span className="region-status">
            {state.status === "ready"
              ? `${state.events.length.toLocaleString()} ${state.events.length === 1 ? "event" : "events"}`
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
            <EmptyState
              title="No matching events"
              onAction={resetFilters}
              actionLabel="Reset filters"
            >
              No published events match the selected UTC range
              {activeFilterDescriptions.length
                ? ` and ${activeFilterDescriptions.join(", ")}`
                : ""}
              . Dates outside preview coverage are not treated as zero activity.
            </EmptyState>
          </div>
        ) : null}
        {state.status === "ready" && state.events.length > 0 ? (
          <EarthquakeMap
            events={state.events}
            selectedEventId={effectiveSelectedEventId}
            mapStyleUrl={getMapStyleUrl()}
            onSelectEvent={selectEvent}
          />
        ) : null}
        {state.status === "ready" ? (
          <MagnitudeQuickFilters
            filters={state.filters}
            disabled={state.isUpdatingTimeWindow}
            onChange={changeMagnitudeQuickFilter}
          />
        ) : null}
        <Button
          ref={detailTriggerRef}
          className="detail-trigger map-detail-trigger"
          variant="primary"
          aria-controls="event-detail"
          aria-expanded={effectiveDetailsOpen}
          onClick={() => setDetailsOpen(true)}
        >
          Event details
        </Button>
      </Surface>

      <EventDetailPanel
        open={effectiveDetailsOpen}
        onClose={closeDetails}
        selectedEvent={selectedEvent}
        manifest={state.status === "ready" ? state.manifest : null}
        loadCapturedHistory={loadCapturedHistory}
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
          <span className="region-status">
            {state.status === "ready" ? "Published coverage" : "Preview activity"}
          </span>
        </div>
        {state.status === "loading" ? (
          <LoadingState label="Loading daily seismic activity" />
        ) : null}
        {state.status === "error" ? (
          <ErrorState
            title="Daily activity unavailable"
            message={state.error.message}
            onRetry={retry}
          />
        ) : null}
        {state.status === "ready" ? (
          <DailyActivityTimeline
            activity={state.activity}
            coverage={state.manifest.includedCoverage}
            timeRangeSelection={state.timeRangeSelection}
            timeWindow={state.timeWindow}
            isUpdating={state.isUpdatingTimeWindow}
            onTimeRangeChange={changeTimeRange}
          />
        ) : null}
      </Surface>

      <Surface className="workspace-table" id="events" aria-labelledby="events-heading">
        <div className="region-heading region-heading--padded">
          <div>
            <p className="eyebrow">Textual results</p>
            <h2 id="events-heading">Earthquake events</h2>
          </div>
          {state.status === "ready" ? (
            <span className="region-status">
              {state.events.length.toLocaleString()}{" "}
              {state.events.length === 1 ? "result" : "results"}
            </span>
          ) : null}
        </div>
        {state.status === "loading" ? (
          <div className="table-state">
            <LoadingState label="Loading earthquake results" />
          </div>
        ) : null}
        {state.status === "error" ? (
          <div className="table-state">
            <ErrorState
              title="Earthquake results unavailable"
              message={state.error.message}
              onRetry={retry}
            />
          </div>
        ) : null}
        {state.status === "ready" && state.events.length === 0 ? (
          <div className="table-state">
            <EmptyState
              title="No matching events"
              onAction={resetFilters}
              actionLabel="Reset filters"
            >
              No published events match the selected UTC range
              {activeFilterDescriptions.length
                ? ` and ${activeFilterDescriptions.join(", ")}`
                : ""}
              . Dates outside preview coverage are not treated as zero activity.
            </EmptyState>
          </div>
        ) : null}
        {state.status === "ready" && state.events.length > 0 ? (
          <EventBrowser
            events={state.events}
            selectedEventId={effectiveSelectedEventId}
            onSelectEvent={selectEvent}
            sort={activeSort}
            page={effectivePage}
            onSortChange={changeSort}
            onPageChange={changePage}
          />
        ) : null}
      </Surface>
    </main>
  );
}
