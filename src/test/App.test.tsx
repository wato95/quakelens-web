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
    expect(screen.getByText("2026 preview")).toBeInTheDocument();
    expect(screen.getByText("Preview", { selector: "span" })).toBeInTheDocument();
  });

  it("does not present event-specific capability states before selection", () => {
    render(<App />);

    expect(screen.queryByRole("heading", { name: "Tectonic setting" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Shaking" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Population exposure" })).toBeNull();
    expect(screen.queryByText("Not available in this preview")).toBeNull();
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
