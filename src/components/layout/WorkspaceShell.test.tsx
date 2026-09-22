import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { parsePreviewManifest } from "../../data/manifest";
import type { PreviewDataSession } from "../../data/types";
import { makeEvent } from "../../test/eventFixture";
import { makePreviewManifest } from "../../test/previewManifestFixture";
import { WorkspaceShell } from "./WorkspaceShell";

vi.mock("../../features/map/EarthquakeMap", () => ({
  EarthquakeMap: ({
    onSelectEvent,
    selectedEventId,
  }: {
    onSelectEvent: (eventId: string) => void;
    selectedEventId: string | null;
  }) => (
    <div data-testid="map-selection" data-selected-event-id={selectedEventId ?? ""}>
      <button type="button" onClick={() => onSelectEvent("event-2")}>
        Select second event on map
      </button>
    </div>
  ),
}));

const events = [
  makeEvent({ eventId: "event-1", placeDescription: "First location" }),
  makeEvent({
    eventId: "event-2",
    eventTime: "2026-08-30T12:00:00.000Z",
    placeDescription: "Second location",
  }),
];

describe("WorkspaceShell selection", () => {
  it("keeps map, textual results and event detail on one selection", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell createSession={makeSessionFactory()} />);

    const firstResult = await screen.findByRole("button", { name: /first location/i });
    await user.click(firstResult);
    expect(firstResult).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("map-selection")).toHaveAttribute(
      "data-selected-event-id",
      "event-1",
    );
    expect(
      screen.getByText("First location", { selector: ".detail-place" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Select second event on map" }),
    );
    expect(screen.getByRole("button", { name: /second location/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByText("Second location", { selector: ".detail-place" }),
    ).toBeInTheDocument();
  });
});

function makeSessionFactory(): () => Promise<PreviewDataSession> {
  return async () => ({
    manifest: parsePreviewManifest(
      makePreviewManifest(),
      new URL("https://example.test/build/manifest.json"),
    ),
    repositories: {
      earthquakes: {
        getEvents: vi.fn(async () => events),
        getEvent: vi.fn(async () => null),
      },
      revisions: { getRevisions: vi.fn(async () => []) },
      activity: { getDailyActivity: vi.fn(async () => []) },
      places: { searchPlaces: vi.fn(async () => []) },
    },
    close: vi.fn(async () => undefined),
  });
}
