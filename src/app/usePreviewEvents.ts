import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { asPreviewDataError, PreviewDataError } from "../data/errors";
import { createPreviewDataSession } from "../data/previewDataSession";
import type {
  CapturedEventState,
  DailyActivity,
  EventFilterOptions,
  EventSummary,
  PlaceSearchResult,
  PreviewDataSession,
  PreviewManifest,
} from "../data/types";
import {
  DEFAULT_BROWSE_FILTERS,
  toRepositoryFilters,
  type BrowseFilters,
} from "../state/browseState";
import {
  deriveTimeWindow,
  resolveTimeRangeSelection,
  toActivityRange,
  type TimeRangeSelection,
  type TimeWindow,
} from "./timeRange";

export type PreviewSessionFactory = () => Promise<PreviewDataSession>;

export type PreviewEventsState =
  | { status: "loading" }
  | {
      status: "ready";
      events: EventSummary[];
      activity: DailyActivity[];
      manifest: PreviewManifest;
      filters: BrowseFilters;
      filterOptions: EventFilterOptions;
      timeRangeSelection: TimeRangeSelection;
      timeWindow: TimeWindow;
      isUpdatingTimeWindow: boolean;
    }
  | { status: "error"; error: PreviewDataError };

export function usePreviewEvents(
  createSession: PreviewSessionFactory = createPreviewDataSession,
  initialFilters: BrowseFilters = DEFAULT_BROWSE_FILTERS,
): {
  state: PreviewEventsState;
  loadCapturedHistory: (eventId: string) => Promise<CapturedEventState[]>;
  searchPlaces: (query: string) => Promise<PlaceSearchResult[]>;
  retry: () => void;
  setFilters: (filters: BrowseFilters) => void;
  setTimeRange: (selection: TimeRangeSelection) => void;
} {
  const [attempt, retry] = useReducer((value: number) => value + 1, 0);
  const [state, setState] = useState<PreviewEventsState>({ status: "loading" });
  const sessionRef = useRef<PreviewDataSession | null>(null);
  const filtersRef = useRef(initialFilters);
  const optionsRef = useRef<EventFilterOptions | null>(null);
  const initialFiltersRef = useRef(initialFilters);
  const timeQueryRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let session: PreviewDataSession | undefined;

    void createSession()
      .then(async (createdSession) => {
        session = createdSession;
        if (disposed) {
          await closeQuietly(session);
          session = undefined;
          return;
        }
        const fullCoverage = deriveTimeWindow(
          session.manifest.includedCoverage,
          "full",
        );
        const [filterOptions, activity] = await Promise.all([
          session.repositories.earthquakes.getFilterOptions(),
          session.repositories.activity.getDailyActivity(toActivityRange(fullCoverage)),
        ]);
        const filters = normalizeBrowseFilters(
          initialFiltersRef.current,
          session.manifest,
          filterOptions,
        );
        const resolvedRange = resolveTimeRangeSelection(
          session.manifest.includedCoverage,
          filters.timeRange,
        );
        const normalizedFilters = { ...filters, timeRange: resolvedRange.selection };
        const events = await session.repositories.earthquakes.getEvents(
          toRepositoryFilters(normalizedFilters, resolvedRange.timeWindow),
        );
        if (disposed) {
          await closeQuietly(session);
          session = undefined;
          return;
        }
        sessionRef.current = session;
        filtersRef.current = normalizedFilters;
        optionsRef.current = filterOptions;
        setState({
          status: "ready",
          events,
          activity,
          manifest: session.manifest,
          filters: normalizedFilters,
          filterOptions,
          timeRangeSelection: normalizedFilters.timeRange,
          timeWindow: resolvedRange.timeWindow,
          isUpdatingTimeWindow: false,
        });
      })
      .catch(async (error: unknown) => {
        if (session) {
          await closeQuietly(session);
          session = undefined;
        }
        if (!disposed) {
          setState({
            status: "error",
            error: asPreviewDataError(
              error,
              "query",
              "Earthquake events could not be loaded",
            ),
          });
        }
      });

    return () => {
      disposed = true;
      sessionRef.current = null;
      timeQueryRef.current += 1;
      if (session) void closeQuietly(session);
    };
  }, [attempt, createSession]);

  return {
    state,
    loadCapturedHistory: useCallback(async (eventId: string) => {
      const session = sessionRef.current;
      if (!session) {
        throw new PreviewDataError(
          "query",
          "Captured history is not available before preview data has loaded",
        );
      }
      return session.repositories.revisions.getRevisions(eventId);
    }, []),
    searchPlaces: useCallback(async (query: string) => {
      const session = sessionRef.current;
      if (!session) return [];
      return session.repositories.places.searchPlaces(query, 8);
    }, []),
    setFilters: useCallback((requestedFilters: BrowseFilters) => {
      const session = sessionRef.current;
      const filterOptions = optionsRef.current;
      if (!session || !filterOptions) return;
      const queryId = ++timeQueryRef.current;
      const filters = normalizeBrowseFilters(
        requestedFilters,
        session.manifest,
        filterOptions,
      );
      const resolved = resolveTimeRangeSelection(
        session.manifest.includedCoverage,
        filters.timeRange,
      );
      const normalizedFilters = { ...filters, timeRange: resolved.selection };
      setState((current) =>
        current.status === "ready"
          ? { ...current, isUpdatingTimeWindow: true }
          : current,
      );
      void session.repositories.earthquakes
        .getEvents(toRepositoryFilters(normalizedFilters, resolved.timeWindow))
        .then((events) => {
          if (queryId !== timeQueryRef.current) return;
          filtersRef.current = normalizedFilters;
          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  events,
                  filters: normalizedFilters,
                  timeRangeSelection: normalizedFilters.timeRange,
                  timeWindow: resolved.timeWindow,
                  isUpdatingTimeWindow: false,
                }
              : current,
          );
        })
        .catch((error: unknown) => {
          if (queryId !== timeQueryRef.current) return;
          setState({
            status: "error",
            error: asPreviewDataError(
              error,
              "query",
              "Earthquake events could not be loaded",
            ),
          });
        });
    }, []),
    setTimeRange: useCallback((selection: TimeRangeSelection) => {
      const session = sessionRef.current;
      const filterOptions = optionsRef.current;
      if (!session || !filterOptions) return;
      const requestedFilters = { ...filtersRef.current, timeRange: selection };
      const queryId = ++timeQueryRef.current;
      const filters = normalizeBrowseFilters(
        requestedFilters,
        session.manifest,
        filterOptions,
      );
      const resolved = resolveTimeRangeSelection(
        session.manifest.includedCoverage,
        filters.timeRange,
      );
      const normalizedFilters = { ...filters, timeRange: resolved.selection };
      setState((current) =>
        current.status === "ready"
          ? { ...current, isUpdatingTimeWindow: true }
          : current,
      );
      void session.repositories.earthquakes
        .getEvents(toRepositoryFilters(normalizedFilters, resolved.timeWindow))
        .then((events) => {
          if (queryId !== timeQueryRef.current) return;
          filtersRef.current = normalizedFilters;
          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  events,
                  filters: normalizedFilters,
                  timeRangeSelection: normalizedFilters.timeRange,
                  timeWindow: resolved.timeWindow,
                  isUpdatingTimeWindow: false,
                }
              : current,
          );
        })
        .catch((error: unknown) => {
          if (queryId !== timeQueryRef.current) return;
          setState({
            status: "error",
            error: asPreviewDataError(
              error,
              "query",
              "Earthquake events could not be loaded",
            ),
          });
        });
    }, []),
    retry: useCallback(() => {
      setState({ status: "loading" });
      retry();
    }, []),
  };
}

function normalizeBrowseFilters(
  filters: BrowseFilters,
  manifest: PreviewManifest,
  options: EventFilterOptions,
): BrowseFilters {
  const resolvedRange = resolveTimeRangeSelection(
    manifest.includedCoverage,
    filters.timeRange,
  );
  const [minimumMagnitude, maximumMagnitude] = normalizeBounds(
    filters.minimumMagnitude,
    filters.maximumMagnitude,
  );
  const [minimumDepthKm, maximumDepthKm] = normalizeBounds(
    filters.minimumDepthKm,
    filters.maximumDepthKm,
  );
  return {
    timeRange: resolvedRange.selection,
    minimumMagnitude,
    maximumMagnitude,
    minimumDepthKm,
    maximumDepthKm,
    eventType: options.eventTypes.includes(filters.eventType) ? filters.eventType : "",
    status: options.statuses.includes(filters.status) ? filters.status : "",
    reviewStatus: options.reviewStatuses.includes(filters.reviewStatus)
      ? filters.reviewStatus
      : "",
    placeQuery: filters.placeQuery.trim().slice(0, 200),
  };
}

function normalizeBounds(
  first: number | null,
  second: number | null,
): [number | null, number | null] {
  if (first === null || second === null || first <= second) return [first, second];
  return [second, first];
}

async function closeQuietly(session: PreviewDataSession): Promise<void> {
  try {
    await session.close();
  } catch {
    // Preserve the primary loading/query outcome during teardown.
  }
}
