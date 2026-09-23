import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../app/App";

describe("QuakeLens application shell", () => {
  it("renders semantic workspace regions and explicit preview coverage", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Workspace sections" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2026 earthquakes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Daily seismic activity" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Earthquake events" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Coverage: 2026 preview")).toBeInTheDocument();
    expect(screen.getByText("Preview", { selector: "span" })).toBeInTheDocument();
  });

  it("presents future scientific capabilities as neutral unavailable states", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Tectonic setting" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Shaking" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Population exposure" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not available in this preview")).toHaveLength(3);
    expect(screen.queryByText(/population exposure.+0/i)).not.toBeInTheDocument();
  });

  it("starts the event-detail sheet closed with an accessible close control", () => {
    render(<App />);

    const detail = screen.getByRole("complementary");
    expect(detail).toHaveAttribute("data-open", "false");
    expect(
      within(detail).getByRole("button", { name: "Close event details" }),
    ).toBeInTheDocument();
  });
});
