import { render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { parsePreviewManifest } from "../data/manifest";
import type { EventSummary, PreviewDataSession } from "../data/types";
import { makeEvent } from "../test/eventFixture";
import { makePreviewManifest } from "../test/previewManifestFixture";
import { usePreviewEvents, type PreviewSessionFactory } from "./usePreviewEvents";

function Harness({ createSession }: { createSession: PreviewSessionFactory }) {
  const { setTimeRange, state } = usePreviewEvents(createSession);
  return (
    <div>
      <p>
        {state.status === "ready"
          ? `${state.events.length} events in ${
              state.timeRangeSelection.kind === "preset"
                ? state.timeRangeSelection.preset
                : "custom"
            }`
          : state.status === "error"
            ? state.error.message
            : state.status}
      </p>
      <button
        type="button"
        onClick={() => setTimeRange({ kind: "preset", preset: "full" })}
      >
        Full preview
      </button>
      <button
        type="button"
        onClick={() =>
          setTimeRange({
            kind: "custom",
            startDateInclusive: "2026-08-12",
            endDateInclusive: "2026-08-16",
          })
        }
      >
        Custom range
      </button>
    </div>
  );
}

function StaleResultHarness({
  createSession,
}: {
  createSession: PreviewSessionFactory;
}) {
  const { setTimeRange, state } = usePreviewEvents(createSession);
  return (
    <div>
      <p>{state.status === "ready" ? state.events[0]?.eventId : state.status}</p>
      <button
        type="button"
        onClick={() =>
          setTimeRange({
            kind: "custom",
            startDateInclusive: "2026-08-10",
            endDateInclusive: "2026-08-10",
          })
        }
      >
        First request
      </button>
      <button
        type="button"
        onClick={() =>
          setTimeRange({
            kind: "custom",
            startDateInclusive: "2026-08-20",
            endDateInclusive: "2026-08-20",
          })
        }
      >
        Second request
      </button>
    </div>
  );
}

function HistoryHarness({ createSession }: { createSession: PreviewSessionFactory }) {
  const { loadCapturedHistory, state } = usePreviewEvents(createSession);
  const [loadedCount, setLoadedCount] = useState<number | null>(null);
  return (
    <div>
      <p>{state.status}</p>
      <button
        type="button"
        disabled={state.status !== "ready"}
        onClick={() =>
          void loadCapturedHistory("us-selected").then((states) =>
            setLoadedCount(states.length),
          )
        }
      >
        Load selected history
      </button>
      {loadedCount === null ? null : <p>{loadedCount} history rows</p>}
    </div>
  );
}

describe("usePreviewEvents", () => {
  it("loads event summaries once and closes the browser session on unmount", async () => {
    const close = vi.fn(async () => undefined);
    const session = makeSession(close);
    const createSession = vi.fn(async () => session);
    const view = render(<Harness createSession={createSession} />);

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("1 events in 30d")).toBeInTheDocument();
    expect(session.repositories.earthquakes.getEvents).toHaveBeenCalledWith({
      startTimeInclusive: "2026-08-02T00:00:00.000Z",
      endTimeExclusive: "2026-09-01T00:00:00Z",
    });
    expect(session.repositories.activity.getDailyActivity).toHaveBeenCalledWith({
      startDateInclusive: "2026-01-01",
      endDateExclusive: "2026-09-01",
    });
    expect(session.repositories.revisions.getRevisions).not.toHaveBeenCalled();

    view.unmount();
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });

  it("re-queries events without reloading activity when the window changes", async () => {
    const user = userEvent.setup();
    const session = makeSession(vi.fn(async () => undefined));
    render(<Harness createSession={async () => session} />);
    expect(await screen.findByText("1 events in 30d")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Full preview" }));
    expect(await screen.findByText("1 events in full")).toBeInTheDocument();
    expect(session.repositories.earthquakes.getEvents).toHaveBeenLastCalledWith({
      startTimeInclusive: "2026-01-01T00:00:00Z",
      endTimeExclusive: "2026-09-01T00:00:00Z",
    });
    expect(session.repositories.activity.getDailyActivity).toHaveBeenCalledOnce();
  });

  it("exposes an on-demand selected-event history query", async () => {
    const user = userEvent.setup();
    const session = makeSession(vi.fn(async () => undefined));
    vi.mocked(session.repositories.revisions.getRevisions).mockResolvedValueOnce([]);
    render(<HistoryHarness createSession={async () => session} />);

    expect(await screen.findByText("ready")).toBeInTheDocument();
    expect(session.repositories.revisions.getRevisions).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Load selected history" }));

    expect(await screen.findByText("0 history rows")).toBeInTheDocument();
    expect(session.repositories.revisions.getRevisions).toHaveBeenCalledOnce();
    expect(session.repositories.revisions.getRevisions).toHaveBeenCalledWith(
      "us-selected",
    );
  });

  it("uses bounded exclusive-end filters for a custom UTC range", async () => {
    const user = userEvent.setup();
    const session = makeSession(vi.fn(async () => undefined));
    render(<Harness createSession={async () => session} />);
    expect(await screen.findByText("1 events in 30d")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Custom range" }));

    expect(await screen.findByText("1 events in custom")).toBeInTheDocument();
    expect(session.repositories.earthquakes.getEvents).toHaveBeenLastCalledWith({
      startTimeInclusive: "2026-08-12T00:00:00.000Z",
      endTimeExclusive: "2026-08-17T00:00:00.000Z",
    });
    expect(session.repositories.activity.getDailyActivity).toHaveBeenCalledOnce();
    expect(session.repositories.revisions.getRevisions).not.toHaveBeenCalled();
  });

  it("ignores an older custom query that resolves after a newer one", async () => {
    const user = userEvent.setup();
    let resolveFirstRequest!: (events: EventSummary[]) => void;
    const firstRequest = new Promise<EventSummary[]>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const session = makeSession(vi.fn(async () => undefined));
    vi.mocked(session.repositories.earthquakes.getEvents)
      .mockResolvedValueOnce([makeEvent({ eventId: "initial-event" })])
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce([makeEvent({ eventId: "newer-event" })]);
    render(<StaleResultHarness createSession={async () => session} />);
    expect(await screen.findByText("initial-event")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "First request" }));
    await user.click(screen.getByRole("button", { name: "Second request" }));
    expect(await screen.findByText("newer-event")).toBeInTheDocument();

    resolveFirstRequest([makeEvent({ eventId: "stale-event" })]);
    await waitFor(() =>
      expect(screen.queryByText("stale-event")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("newer-event")).toBeInTheDocument();
  });

  it("reports repository failures as an explicit application state", async () => {
    const createSession = vi.fn(async () => {
      throw new Error("broken repository");
    });

    render(<Harness createSession={createSession} />);

    expect(
      await screen.findByText("Earthquake events could not be loaded"),
    ).toBeInTheDocument();
  });
});

function makeSession(close: () => Promise<void>): PreviewDataSession {
  return {
    manifest: parsePreviewManifest(
      makePreviewManifest(),
      new URL("https://example.test/build/manifest.json"),
    ),
    repositories: {
      earthquakes: {
        getEvents: vi.fn(async () => [makeEvent()]),
        getEvent: vi.fn(async () => null),
      },
      revisions: { getRevisions: vi.fn(async () => []) },
      activity: { getDailyActivity: vi.fn(async () => []) },
      places: { searchPlaces: vi.fn(async () => []) },
    },
    close,
  };
}
