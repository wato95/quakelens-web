import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppFooter } from "./AppFooter";
import { tectonicManifest } from "../../test/tectonicFixture";
import { makePreviewManifest } from "../../test/previewManifestFixture";
import { parsePreviewManifest } from "../../data/manifest";

describe("footer references", () => {
  it("keeps PB2002 attribution and licence reachable separately from event attribution", async () => {
    render(<AppFooter manifest={tectonicManifest} />);
    expect(
      screen.getByRole("region", { name: "Data and references" }),
    ).toBeInTheDocument();
    const eventSource = tectonicManifest.sources.find(
      (source) => source.sourceId === "usgs_earthquakes",
    )!;
    expect(screen.getByRole("link", { name: eventSource.provider })).toHaveAttribute(
      "href",
      eventSource.sourceUrl,
    );
    await userEvent.click(screen.getByText("PB2002 source and licence"));
    expect(screen.getByText(/GIS conversion: Hugo Ahlenius/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Pinned PB2002 source" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open Data Commons Attribution License 1.0" }),
    ).toHaveAttribute("href", "https://opendatacommons.org/licenses/by/1-0/");
    expect(screen.getByText(/Cartographic context only/)).toBeVisible();
  });
  it("omits the boundary reference for the original preview", () => {
    const manifest = parsePreviewManifest(
      makePreviewManifest(),
      new URL("https://example.test/manifest.json"),
    );
    render(<AppFooter manifest={manifest} />);
    expect(screen.queryByText("PB2002 source and licence")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source licence" })).toBeInTheDocument();
  });
});
