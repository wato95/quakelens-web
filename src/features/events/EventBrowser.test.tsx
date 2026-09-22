import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeEvent } from "../../test/eventFixture";
import { EventBrowser } from "./EventBrowser";

const events = [
  makeEvent({ eventId: "event-3", placeDescription: "Newest event" }),
  makeEvent({
    eventId: "event-2",
    eventTime: "2026-08-30T12:00:00.000Z",
    placeDescription: "Middle event",
  }),
  makeEvent({
    eventId: "event-1",
    eventTime: "2026-08-29T12:00:00.000Z",
    placeDescription: "Oldest event",
  }),
];

describe("EventBrowser", () => {
  it("selects a result with the keyboard and exposes textual event fields", async () => {
    const onSelectEvent = vi.fn();
    const user = userEvent.setup();
    render(
      <EventBrowser
        events={events}
        selectedEventId={null}
        onSelectEvent={onSelectEvent}
      />,
    );

    const newest = screen.getByRole("button", { name: /newest event/i });
    newest.focus();
    await user.keyboard("{Enter}");

    expect(onSelectEvent).toHaveBeenCalledWith("event-3");
    expect(screen.getByText("31 Aug 2026, 12:00:00 UTC")).toBeInTheDocument();
    expect(screen.getAllByText("8.1 km").length).toBeGreaterThan(0);
    expect(screen.getAllByText("earthquake").length).toBeGreaterThan(0);
    expect(screen.getAllByText("reviewed / reviewed").length).toBeGreaterThan(0);
  });

  it("reveals the page containing an event selected from the map", () => {
    render(
      <EventBrowser
        events={events}
        selectedEventId="event-1"
        onSelectEvent={vi.fn()}
        pageSize={2}
      />,
    );

    expect(screen.getByText("Page 2 of 2 · events 3–3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /oldest event/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: /newest event/i }),
    ).not.toBeInTheDocument();
  });

  it("paginates a large result set without rendering every event", async () => {
    const user = userEvent.setup();
    render(
      <EventBrowser
        events={events}
        selectedEventId={null}
        onSelectEvent={vi.fn()}
        pageSize={2}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /oldest event/i })).toBeInTheDocument();
  });
});
