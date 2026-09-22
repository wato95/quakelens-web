import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_BROWSE_FILTERS } from "../../state/browseState";
import { BrowseFilters } from "./BrowseFilters";

const options = {
  eventTypes: ["earthquake", "quarry blast"],
  statuses: ["automatic", "reviewed"],
  reviewStatuses: ["automatic", "reviewed"],
};

describe("BrowseFilters", () => {
  it("applies supported event filters as typed values", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <BrowseFilters
        filters={DEFAULT_BROWSE_FILTERS}
        options={options}
        isUpdating={false}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Event location text"), "Alaska");
    await user.type(screen.getByLabelText("Minimum magnitude"), "4.5");
    await user.selectOptions(screen.getByLabelText("Event type"), "earthquake");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        placeQuery: "Alaska",
        minimumMagnitude: 4.5,
        eventType: "earthquake",
      }),
    );
  });

  it("rejects inverted ranges before querying", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <BrowseFilters
        filters={DEFAULT_BROWSE_FILTERS}
        options={options}
        isUpdating={false}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Minimum depth (km)"), "20");
    await user.type(screen.getByLabelText("Maximum depth (km)"), "10");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Minimum depth cannot exceed maximum depth",
    );
    expect(onApply).not.toHaveBeenCalled();
  });
});
