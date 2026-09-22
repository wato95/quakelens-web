import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { parsePreviewManifest } from "../../data/manifest";
import type {
  EventFilters,
  PreviewDataSession,
  RevisionRepository,
} from "../../data/types";
import { makeEvent } from "../../test/eventFixture";
import { makeCapturedState } from "../../test/capturedStateFixture";
import { makePreviewManifest } from "../../test/previewManifestFixture";
import { WorkspaceShell } from "./WorkspaceShell";

vi.mock("../../features/map/EarthquakeMap", () => ({
  EarthquakeMap: ({
    events,
    onSelectEvent,
    selectedEventId,
  }: {
    events: Array<unknown>;
    onSelectEvent: (eventId: string) => void;
    selectedEventId: string | null;
  }) => (
    <div
      data-testid="map-selection"
      data-event-count={events.length}
      data-selected-event-id={selectedEventId ?? ""}
    >
      <button type="button" onClick={() => onSelectEvent("event-2")}>
        Select second event on map
      </button>
    </div>
  ),
}));

const events = [
  makeEvent({
    eventId: "event-1",
    eventTime: "2026-08-10T12:00:00.000Z",
    placeDescription: "First location",
  }),
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

  it("updates map and textual results together and clears an excluded selection", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell createSession={makeSessionFactory()} />);

    const firstResult = await screen.findByRole("button", { name: /first location/i });
    await user.click(firstResult);
    expect(screen.getByTestId("map-selection")).toHaveAttribute(
      "data-selected-event-id",
      "event-1",
    );

    await user.click(screen.getByRole("button", { name: "7 days" }));

    expect(await screen.findByText("1 result")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /first location/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /second location/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("map-selection")).toHaveAttribute(
      "data-event-count",
      "1",
    );
    expect(screen.getByTestId("map-selection")).toHaveAttribute(
      "data-selected-event-id",
      "",
    );
    expect(screen.getByRole("complementary")).toHaveAttribute("data-open", "false");
  });

  it("retains an included selection for a custom range and resets to a preset", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell createSession={makeSessionFactory()} />);

    const secondResult = await screen.findByRole("button", {
      name: /second location/i,
    });
    await user.click(secondResult);
    fireEvent.change(screen.getByLabelText("Start date (UTC)"), {
      target: { value: "2026-08-30" },
    });
    fireEvent.change(screen.getByLabelText("End date (UTC, inclusive)"), {
      target: { value: "2026-08-31" },
    });
    await user.click(screen.getByRole("button", { name: "Apply UTC range" }));

    expect(await screen.findByText("1 result")).toBeInTheDocument();
    expect(screen.getByTestId("map-selection")).toHaveAttribute(
      "data-selected-event-id",
      "event-2",
    );
    expect(screen.getByText("Custom")).toHaveAttribute("data-active", "true");

    await user.click(screen.getByRole("button", { name: "Full preview" }));
    expect(await screen.findByText("2 results")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full preview" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("clears a selected event outside an applied custom range", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell createSession={makeSessionFactory()} />);

    const firstResult = await screen.findByRole("button", { name: /first location/i });
    await user.click(firstResult);
    fireEvent.change(screen.getByLabelText("Start date (UTC)"), {
      target: { value: "2026-08-30" },
    });
    fireEvent.change(screen.getByLabelText("End date (UTC, inclusive)"), {
      target: { value: "2026-08-31" },
    });
    await user.click(screen.getByRole("button", { name: "Apply UTC range" }));

    expect(await screen.findByText("1 result")).toBeInTheDocument();
    expect(screen.getByTestId("map-selection")).toHaveAttribute(
      "data-selected-event-id",
      "",
    );
    expect(screen.getByRole("complementary")).toHaveAttribute("data-open", "false");
  });

  it("does not query revisions until captured history is opened", async () => {
    const user = userEvent.setup();
    const getRevisions = vi.fn(async (eventId: string) => [
      makeCapturedState({ eventId }),
      makeCapturedState({
        eventId,
        capturedStateNumber: 2,
        isInitialState: false,
        eventRevisionId: `${eventId}-revision-2`,
        changedFields: ["source_updated_at"],
      }),
    ]);
    render(<WorkspaceShell createSession={makeSessionFactory(getRevisions)} />);

    await user.click(await screen.findByRole("button", { name: /first location/i }));
    expect(getRevisions).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "View captured history (2 states)" }),
    );

    expect(await screen.findByText("Source update observed")).toBeInTheDocument();
    expect(getRevisions).toHaveBeenCalledOnce();
    expect(getRevisions).toHaveBeenCalledWith("event-1");
  });
});

function makeSessionFactory(
  getRevisions: RevisionRepository["getRevisions"] = vi.fn(async () => []),
): () => Promise<PreviewDataSession> {
  return async () => ({
    manifest: parsePreviewManifest(
      makePreviewManifest(),
      new URL("https://example.test/build/manifest.json"),
    ),
    repositories: {
      earthquakes: {
        getEvents: vi.fn(async (filters: EventFilters = {}) =>
          events.filter(
            (event) =>
              (!filters.startTimeInclusive ||
                event.eventTime >= filters.startTimeInclusive) &&
              (!filters.endTimeExclusive || event.eventTime < filters.endTimeExclusive),
          ),
        ),
        getEvent: vi.fn(async () => null),
      },
      revisions: { getRevisions },
      activity: {
        getDailyActivity: vi.fn(async () => [
          {
            activityDateUtc: "2026-08-10",
            eventCount: 1,
            maxMagnitude: 6.2,
          },
          {
            activityDateUtc: "2026-08-30",
            eventCount: 1,
            maxMagnitude: 6.2,
          },
        ]),
      },
      places: { searchPlaces: vi.fn(async () => []) },
    },
    close: vi.fn(async () => undefined),
  });
}
