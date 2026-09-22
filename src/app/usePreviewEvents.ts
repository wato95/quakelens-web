import { useCallback, useEffect, useReducer, useState } from "react";

import { asPreviewDataError } from "../data/errors";
import type { PreviewDataError } from "../data/errors";
import { createPreviewDataSession } from "../data/previewDataSession";
import type { EventSummary, PreviewDataSession, PreviewManifest } from "../data/types";

export type PreviewSessionFactory = () => Promise<PreviewDataSession>;

export type PreviewEventsState =
  | { status: "loading" }
  | { status: "ready"; events: EventSummary[]; manifest: PreviewManifest }
  | { status: "error"; error: PreviewDataError };

export function usePreviewEvents(
  createSession: PreviewSessionFactory = createPreviewDataSession,
): { state: PreviewEventsState; retry: () => void } {
  const [attempt, retry] = useReducer((value: number) => value + 1, 0);
  const [state, setState] = useState<PreviewEventsState>({ status: "loading" });

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
        const events = await session.repositories.earthquakes.getEvents();
        if (disposed) {
          await closeQuietly(session);
          session = undefined;
          return;
        }
        setState({ status: "ready", events, manifest: session.manifest });
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
      if (session) void closeQuietly(session);
    };
  }, [attempt, createSession]);

  return {
    state,
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
