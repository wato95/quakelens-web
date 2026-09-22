import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeCapturedState } from "../../test/capturedStateFixture";
import { CapturedHistory } from "./CapturedHistory";

describe("CapturedHistory", () => {
  it("queries only the selected event when opened and reuses the loaded states", async () => {
    const user = userEvent.setup();
    const loadCapturedHistory = vi.fn(async () => [
      makeCapturedState(),
      makeCapturedState({
        capturedStateNumber: 2,
        isInitialState: false,
        eventRevisionId: "revision-2",
        changedFields: ["source_updated_at"],
      }),
    ]);
    render(
      <CapturedHistory
        eventId="us-selected"
        expectedStateCount={2}
        loadCapturedHistory={loadCapturedHistory}
      />,
    );

    expect(loadCapturedHistory).not.toHaveBeenCalled();
    const trigger = screen.getByRole("button", {
      name: "View captured history (2 states)",
    });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(loadCapturedHistory).toHaveBeenCalledOnce();
    expect(loadCapturedHistory).toHaveBeenCalledWith("us-selected");
    expect(await screen.findByText("Initial captured state")).toBeInTheDocument();
    expect(screen.getByText("Source update observed")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Enter}");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{Enter}");
    expect(loadCapturedHistory).toHaveBeenCalledOnce();
  });

  it("presents a single captured state as a useful non-error state", async () => {
    const user = userEvent.setup();
    render(
      <CapturedHistory
        eventId="us-one"
        expectedStateCount={1}
        loadCapturedHistory={async () => [makeCapturedState()]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "View captured history (1 state)" }),
    );

    expect(await screen.findByText("1 captured state loaded")).toBeInTheDocument();
    expect(
      screen.getByText("Only the initial captured state is published for this event."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows both counts when queried states do not match the event summary", async () => {
    const user = userEvent.setup();
    render(
      <CapturedHistory
        eventId="us-mismatch"
        expectedStateCount={2}
        loadCapturedHistory={async () => [makeCapturedState()]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "View captured history (2 states)" }),
    );

    expect(
      await screen.findByText(
        "1 captured state loaded; published event summary reports 2",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/both values are shown without adjustment/i),
    ).toBeInTheDocument();
  });

  it("offers a local retry when the captured-state query fails", async () => {
    const user = userEvent.setup();
    const loadCapturedHistory = vi
      .fn<() => Promise<ReturnType<typeof makeCapturedState>[]>>()
      .mockRejectedValueOnce(new Error("Revision query failed"))
      .mockResolvedValueOnce([makeCapturedState()]);
    render(
      <CapturedHistory
        eventId="us-retry"
        expectedStateCount={1}
        loadCapturedHistory={loadCapturedHistory}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "View captured history (1 state)" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Revision query failed");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Initial captured state")).toBeInTheDocument();
    expect(loadCapturedHistory).toHaveBeenCalledTimes(2);
  });
});
