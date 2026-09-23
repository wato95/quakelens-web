import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

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
    await user.click(screen.getByRole("button", { name: "Custom" }));
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
    expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

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
    await user.click(screen.getByRole("button", { name: "Custom" }));
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

  it("restores selection and filters from a share URL", async () => {
    window.history.replaceState({}, "", "/?range=full&event=event-1&q=First&minMag=5");
    render(<WorkspaceShell createSession={makeSessionFactory()} />);

    expect(await screen.findByLabelText("Search earthquake locations")).toHaveValue(
      "First",
    );
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByLabelText("Minimum magnitude")).toHaveValue(5);
    expect(screen.getByRole("button", { name: /first location/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("complementary")).toHaveAttribute("data-open", "true");
    expect(window.location.search).toContain("event=event-1");
  });

  it("updates results and the query string from event text search", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell createSession={makeSessionFactory()} />);

    const query = await screen.findByLabelText("Search earthquake locations");
    await user.type(query, "Second");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("1 result")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /first location/i }),
    ).not.toBeInTheDocument();
    expect(window.location.search).toContain("q=Second");

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(await screen.findByText("2 results")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("uses shared magnitude quick filters and clears a custom maximum", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell createSession={makeSessionFactory()} />);
    await screen.findByText("2 results");

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.type(screen.getByLabelText("Minimum magnitude"), "5");
    await user.type(screen.getByLabelText("Maximum magnitude"), "6");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    const quickGroup = screen.getByRole("group", {
      name: "Minimum magnitude quick filter",
    });
    expect(within(quickGroup).getByRole("button", { name: "M5+" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(within(quickGroup).getByRole("button", { name: "M6+" }));
    expect(await screen.findByText("2 results")).toBeInTheDocument();
    expect(window.location.search).toContain("minMag=6");
    expect(window.location.search).not.toContain("maxMag");
    expect(within(quickGroup).getByRole("button", { name: "M6+" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("resets a shared URL page after event search changes the results", async () => {
    const user = userEvent.setup();
    const manyEvents = Array.from({ length: 25 }, (_, index) =>
      makeEvent({
        eventId: `event-${index + 1}`,
        eventTime: "2026-08-30T12:00:00.000Z",
        placeDescription: `Location ${index + 1}`,
      }),
    );
    window.history.replaceState({}, "", "/?range=full&page=2");
    render(
      <WorkspaceShell
        createSession={makeSessionFactory(
          vi.fn(async () => []),
          manyEvents,
        )}
      />,
    );

    expect(
      await screen.findByText("Page 2 of 2 · events 25–25 of 25"),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search earthquake locations"), "Location 1");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("11 results")).toBeInTheDocument();
    expect(window.location.search).not.toContain("page=2");
  });

  it("keeps Census place search out of the V1 control surface", async () => {
    render(<WorkspaceShell createSession={makeSessionFactory()} />);
    expect(
      await screen.findByLabelText("Search earthquake locations"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Find a U.S. Census place")).not.toBeInTheDocument();
  });
});

function makeSessionFactory(
  getRevisions: RevisionRepository["getRevisions"] = vi.fn(async () => []),
  sourceEvents = events,
): () => Promise<PreviewDataSession> {
  return async () => ({
    manifest: parsePreviewManifest(
      makePreviewManifest(),
      new URL("https://example.test/build/manifest.json"),
    ),
    repositories: {
      earthquakes: {
        getEvents: vi.fn(async (filters: EventFilters = {}) =>
          sourceEvents.filter(
            (event) =>
              (!filters.startTimeInclusive ||
                event.eventTime >= filters.startTimeInclusive) &&
              (!filters.endTimeExclusive ||
                event.eventTime < filters.endTimeExclusive) &&
              (!filters.minimumMagnitude ||
                event.magnitude >= filters.minimumMagnitude) &&
              (!filters.placeQuery ||
                event.placeDescription
                  .toLowerCase()
                  .includes(filters.placeQuery.toLowerCase())),
          ),
        ),
        getEvent: vi.fn(async () => null),
        getFilterOptions: vi.fn(async () => ({
          eventTypes: ["earthquake"],
          statuses: ["reviewed"],
          reviewStatuses: ["reviewed"],
        })),
        getPreviewStatistics: vi.fn(async () => ({
          totalEvents: sourceEvents.length,
          magnitude5Plus: sourceEvents.filter((event) => event.magnitude >= 5).length,
          magnitude6Plus: sourceEvents.filter((event) => event.magnitude >= 6).length,
          magnitude7Plus: sourceEvents.filter((event) => event.magnitude >= 7).length,
        })),
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
