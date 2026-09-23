import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeEvent } from "../../test/eventFixture";
import { EventBrowser } from "./EventBrowser";

const events = Array.from({ length: 25 }, (_, index) =>
  makeEvent({
    eventId: `event-${String(index + 1).padStart(2, "0")}`,
    eventTime: new Date(Date.UTC(2026, 7, 31, 12, 0, -index)).toISOString(),
    placeDescription: `Location ${index + 1}`,
  }),
);

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

    const first = screen.getByRole("button", { name: /location 1,/i });
    first.focus();
    await user.keyboard("{Enter}");

    expect(onSelectEvent).toHaveBeenCalledWith("event-01");
    expect(screen.getAllByText("8.1 km").length).toBeGreaterThan(0);
    expect(screen.getAllByText("earthquake").length).toBeGreaterThan(0);
    expect(screen.getAllByText("reviewed").length).toBeGreaterThan(0);
  });

  it("uses 24-row page boundaries and reports controlled page changes", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    const view = render(
      <EventBrowser
        events={events}
        selectedEventId={null}
        onSelectEvent={vi.fn()}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(24);
    expect(screen.getByText("Page 1 of 2 · events 1–24 of 25")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    view.rerender(
      <EventBrowser
        events={events}
        selectedEventId="event-25"
        onSelectEvent={vi.fn()}
        page={2}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /location 25/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("exposes accessible sort state and toggles each sortable heading", async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(
      <EventBrowser
        events={events.slice(0, 2)}
        selectedEventId={null}
        onSelectEvent={vi.fn()}
        sort={{ field: "eventTime", direction: "desc" }}
        onSortChange={onSortChange}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: /event time utc/i }),
    ).toHaveAttribute("aria-sort", "descending");
    for (const name of [
      "Event time UTC",
      "Magnitude",
      "Depth (km)",
      "Place",
      "Event type",
      "Status",
    ]) {
      await user.click(screen.getByRole("button", { name }));
    }
    expect(onSortChange).toHaveBeenCalledTimes(6);
    expect(onSortChange).toHaveBeenNthCalledWith(1, {
      field: "eventTime",
      direction: "asc",
    });
    expect(onSortChange).toHaveBeenLastCalledWith({
      field: "status",
      direction: "asc",
    });
  });
});
