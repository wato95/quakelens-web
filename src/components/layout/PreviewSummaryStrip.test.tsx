import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PreviewSummaryStrip } from "./PreviewSummaryStrip";

describe("PreviewSummaryStrip", () => {
  it("labels stable counts as full preview statistics", () => {
    render(
      <PreviewSummaryStrip
        year={2026}
        statistics={{
          totalEvents: 19_503,
          magnitude5Plus: 642,
          magnitude6Plus: 94,
          magnitude7Plus: 12,
        }}
      />,
    );

    const summary = screen.getByTestId("preview-summary");
    expect(summary).toHaveAccessibleName("2026 preview catalogue summary");
    expect(within(summary).getByText("19,503")).toBeInTheDocument();
    expect(within(summary).getByText("642")).toBeInTheDocument();
    expect(within(summary).getByText("94")).toBeInTheDocument();
    expect(within(summary).getByText("12")).toBeInTheDocument();
    expect(within(summary).getByText("2026 preview")).toBeInTheDocument();
  });
});
