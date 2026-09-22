import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";

describe("shared application states", () => {
  it("announces loading without exposing decorative skeletons", () => {
    render(<LoadingState label="Loading earthquake events" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading earthquake events");
  });

  it("offers a recovery action for no results", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        title="No matching events"
        actionLabel="Reset filters"
        onAction={onReset}
      >
        Change or reset the current filters.
      </EmptyState>,
    );

    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("distinguishes a technical error and exposes retry", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorState
        title="Preview data could not be read"
        message="Check the published artifact and try again."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
