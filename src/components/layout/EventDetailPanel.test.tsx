import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { parsePreviewManifest } from "../../data/manifest";
import { makeEvent } from "../../test/eventFixture";
import { makePreviewManifest } from "../../test/previewManifestFixture";
import { EventDetailPanel } from "./EventDetailPanel";

const manifest = parsePreviewManifest(
  makePreviewManifest(),
  new URL("https://example.test/build/manifest.json"),
);

describe("EventDetailPanel", () => {
  it("presents supported event fields, attribution and captured-state wording", () => {
    render(
      <EventDetailPanel
        open
        onClose={vi.fn()}
        selectedEvent={makeEvent()}
        manifest={manifest}
        loadCapturedHistory={vi.fn(async () => [])}
      />,
    );

    expect(screen.getByText("M6.2")).toBeInTheDocument();
    expect(screen.getByText("31 Aug 2026, 12:00:00 UTC")).toBeInTheDocument();
    expect(screen.getByText("31 Aug 2026, 12:03:00 UTC")).toBeInTheDocument();
    expect(screen.getByText("8.1 km")).toBeInTheDocument();
    expect(screen.getByText("35.2000° N, 120.5000° W")).toBeInTheDocument();
    expect(screen.getByText("2 captured states")).toBeInTheDocument();
    expect(screen.queryByText(/updated 2 times/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "U.S. Geological Survey (USGS)" }),
    ).toHaveAttribute("href", "https://earthquake.usgs.gov/data/comcat/");
    expect(screen.getByRole("link", { name: "USGS public domain" })).toHaveAttribute(
      "href",
      "https://www.usgs.gov/",
    );
    expect(screen.getAllByText("Not available in this preview")).toHaveLength(3);
  });

  it("renders a neutral no-selection state and closes with Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <EventDetailPanel
        open
        onClose={onClose}
        selectedEvent={null}
        manifest={null}
        loadCapturedHistory={vi.fn(async () => [])}
      />,
    );

    expect(
      screen.getByText(/select an earthquake on the map or in/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Not available in this preview")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
