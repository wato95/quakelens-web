import { useCallback, useEffect, useRef, useState } from "react";

import type { CapturedEventState } from "../../data/types";

export type CapturedHistoryLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; states: CapturedEventState[] }
  | { status: "error"; message: string };

type CapturedHistoryLoader = (eventId: string) => Promise<CapturedEventState[]>;

export function useCapturedHistory(
  eventId: string,
  loadCapturedHistory: CapturedHistoryLoader,
): {
  expanded: boolean;
  state: CapturedHistoryLoadState;
  close: () => void;
  open: () => void;
  retry: () => void;
} {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<CapturedHistoryLoadState>({ status: "idle" });
  const requestIdRef = useRef(0);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setState({ status: "loading" });
    void loadCapturedHistory(eventId)
      .then((states) => {
        if (requestId !== requestIdRef.current) return;
        setState({ status: "ready", states });
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : "The captured-state query failed",
        });
      });
  }, [eventId, loadCapturedHistory]);

  return {
    expanded,
    state,
    close: useCallback(() => setExpanded(false), []),
    open: useCallback(() => {
      setExpanded(true);
      if (state.status === "idle" || state.status === "error") load();
    }, [load, state.status]),
    retry: load,
  };
}
