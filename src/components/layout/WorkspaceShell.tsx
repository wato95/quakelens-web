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
import { EventBrowser } from "../../features/events/EventBrowser";
import { BrowseFilters } from "../../features/filters/BrowseFilters";
import { PlaceSearch } from "../../features/search/PlaceSearch";
import { DailyActivityTimeline } from "../../features/timeline/DailyActivityTimeline";
import type { PlaceSearchResult } from "../../data/types";
import {
  DEFAULT_BROWSE_FILTERS,
  describeActiveFilters,
  type BrowseFilters as BrowseFiltersState,
  type BrowseState,
} from "../../state/browseState";
import { parseUrlState, serializeUrlState } from "../../state/urlState";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import { Surface } from "../ui/Surface";
import { EventDetailPanel } from "./EventDetailPanel";

type WorkspaceShellProps = {
  createSession?: PreviewSessionFactory;
};

export function WorkspaceShell({ createSession }: WorkspaceShellProps) {
  const [initialUrlState] = useState(() =>
    typeof window === "undefined"
      ? { filters: DEFAULT_BROWSE_FILTERS, selectedEventId: null }
      : parseUrlState(window.location.search),
  );
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(initialUrlState.selectedEventId),
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialUrlState.selectedEventId,
  );
  const [placeContext, setPlaceContext] = useState<PlaceSearchResult | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const detailTriggerRef = useRef<HTMLButtonElement>(null);
  const { loadCapturedHistory, retry, searchPlaces, setFilters, state } =
    usePreviewEvents(createSession, initialUrlState.filters);
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
      setPlaceContext(null);
      setFilters(restored.filters);
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
    updateUrl(
      { filters: state.filters, selectedEventId: normalizedSelection },
      "replace",
    );
  }, [selectedEventId, state, updateUrl]);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    detailTriggerRef.current?.focus();
  }, []);
  const selectEvent = useCallback(
    (eventId: string) => {
      setSelectedEventId(eventId);
      setDetailsOpen(true);
      if (state.status === "ready") {
        updateUrl({ filters: state.filters, selectedEventId: eventId }, "push");
      }
    },
    [state, updateUrl],
  );
  const applyFilters = useCallback(
    (filters: BrowseFiltersState) => {
      setSelectedEventId(null);
      setDetailsOpen(false);
      setFilters(filters);
      if (state.status === "ready") {
        updateUrl({ filters, selectedEventId: null }, "push");
      }
    },
    [setFilters, state, updateUrl],
  );
  const resetFilters = useCallback(() => {
    setSelectedEventId(null);
    setDetailsOpen(false);
    setPlaceContext(null);
    setFilters(DEFAULT_BROWSE_FILTERS);
    updateUrl({ filters: DEFAULT_BROWSE_FILTERS, selectedEventId: null }, "push");
  }, [setFilters, updateUrl]);
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
      setFilters(nextFilters);
      updateUrl(
        {
          filters: nextFilters,
          selectedEventId:
            selectedEvent && timeWindowContains(nextWindow, selectedEvent.eventTime)
              ? selectedEventId
              : null,
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
            <BrowseFilters
              key={JSON.stringify(state.filters)}
              filters={state.filters}
              options={state.filterOptions}
              isUpdating={state.isUpdatingTimeWindow}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </Surface>
        ) : (
          <Surface className="browse-controls">
            <LoadingState label="Loading search and filters" />
          </Surface>
        )}
        <Surface className="place-controls">
          <PlaceSearch
            searchPlaces={searchPlaces}
            selectedPlaceId={placeContext?.placeId ?? null}
            onSelectPlace={setPlaceContext}
            disabled={state.status !== "ready"}
          />
        </Surface>
        <div className="toolbar-actions">
          <Button onClick={() => void copyShareLink()}>Copy link</Button>
          <span className="share-status" aria-live="polite">
            {shareStatus}
          </span>
          <Button
            ref={detailTriggerRef}
            className="detail-trigger"
            variant="primary"
            aria-controls="event-detail"
            aria-expanded={effectiveDetailsOpen}
            onClick={() => setDetailsOpen(true)}
          >
            Event details
          </Button>
        </div>
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
        {state.status === "ready" && state.events.length === 0 && !placeContext ? (
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
        {state.status === "ready" &&
        (state.events.length > 0 || placeContext !== null) ? (
          <EarthquakeMap
            events={state.events}
            selectedEventId={effectiveSelectedEventId}
            mapStyleUrl={getMapStyleUrl()}
            onSelectEvent={selectEvent}
            placeContext={placeContext}
          />
        ) : null}
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
          />
        ) : null}
      </Surface>
    </main>
  );
}
