import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { asPreviewDataError } from "../data/errors";
import type { PreviewDataError } from "../data/errors";
import { createPreviewDataSession } from "../data/previewDataSession";
import type {
  DailyActivity,
  EventSummary,
  PreviewDataSession,
  PreviewManifest,
} from "../data/types";
import {
  deriveTimeWindow,
  resolveTimeRangeSelection,
  toActivityRange,
  toEventFilters,
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
      timeRangeSelection: TimeRangeSelection;
      timeWindow: TimeWindow;
      isUpdatingTimeWindow: boolean;
    }
  | { status: "error"; error: PreviewDataError };

export function usePreviewEvents(
  createSession: PreviewSessionFactory = createPreviewDataSession,
): {
  state: PreviewEventsState;
  retry: () => void;
  setTimeRange: (selection: TimeRangeSelection) => void;
} {
  const [attempt, retry] = useReducer((value: number) => value + 1, 0);
  const [state, setState] = useState<PreviewEventsState>({ status: "loading" });
  const sessionRef = useRef<PreviewDataSession | null>(null);
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
        const timeRangeSelection = { kind: "preset", preset: "30d" } as const;
        const timeWindow = deriveTimeWindow(session.manifest.includedCoverage, "30d");
        const fullCoverage = deriveTimeWindow(
          session.manifest.includedCoverage,
          "full",
        );
        const [events, activity] = await Promise.all([
          session.repositories.earthquakes.getEvents(toEventFilters(timeWindow)),
          session.repositories.activity.getDailyActivity(toActivityRange(fullCoverage)),
        ]);
        if (disposed) {
          await closeQuietly(session);
          session = undefined;
          return;
        }
        sessionRef.current = session;
        setState({
          status: "ready",
          events,
          activity,
          manifest: session.manifest,
          timeRangeSelection,
          timeWindow,
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
    setTimeRange: useCallback((selection: TimeRangeSelection) => {
      const session = sessionRef.current;
      if (!session) return;
      const queryId = ++timeQueryRef.current;
      const resolved = resolveTimeRangeSelection(
        session.manifest.includedCoverage,
        selection,
      );
      setState((current) =>
        current.status === "ready"
          ? { ...current, isUpdatingTimeWindow: true }
          : current,
      );
      void session.repositories.earthquakes
        .getEvents(toEventFilters(resolved.timeWindow))
        .then((events) => {
          if (queryId !== timeQueryRef.current) return;
          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  events,
                  timeRangeSelection: resolved.selection,
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

async function closeQuietly(session: PreviewDataSession): Promise<void> {
  try {
    await session.close();
  } catch {
    // Preserve the primary loading/query outcome during teardown.
  }
}
