import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PreviewDataSession, PreviewManifest } from "../data/types";
import { makeEvent } from "../test/eventFixture";
import { usePreviewEvents, type PreviewSessionFactory } from "./usePreviewEvents";

function Harness({ createSession }: { createSession: PreviewSessionFactory }) {
  const { state } = usePreviewEvents(createSession);
  return (
    <p>
      {state.status === "ready"
        ? `${state.events.length} events`
        : state.status === "error"
          ? state.error.message
          : state.status}
    </p>
  );
}

describe("usePreviewEvents", () => {
  it("loads event summaries once and closes the browser session on unmount", async () => {
    const close = vi.fn(async () => undefined);
    const session = makeSession(close);
    const createSession = vi.fn(async () => session);
    const view = render(<Harness createSession={createSession} />);

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("1 events")).toBeInTheDocument();
    expect(session.repositories.revisions.getRevisions).not.toHaveBeenCalled();

    view.unmount();
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
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
    manifest: {} as PreviewManifest,
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
