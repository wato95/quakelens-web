import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { parsePreviewManifest } from "../data/manifest";
import type { PreviewDataSession } from "../data/types";
import { makeEvent } from "../test/eventFixture";
import { makePreviewManifest } from "../test/previewManifestFixture";
import { usePreviewEvents, type PreviewSessionFactory } from "./usePreviewEvents";

function Harness({ createSession }: { createSession: PreviewSessionFactory }) {
  const { setTimeRangePreset, state } = usePreviewEvents(createSession);
  return (
    <div>
      <p>
        {state.status === "ready"
          ? `${state.events.length} events in ${state.timeRangePreset}`
          : state.status === "error"
            ? state.error.message
            : state.status}
      </p>
      <button type="button" onClick={() => setTimeRangePreset("full")}>
        Full preview
      </button>
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
