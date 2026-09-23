import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PlaceSearchResult } from "../../data/types";
import { PlaceSearch } from "./PlaceSearch";

const paris: PlaceSearchResult = {
  placeId: "48-paris",
  name: "Paris",
  placeType: "incorporated place",
  countryCode: "US",
  admin1Code: "48",
  admin1Name: "Texas",
  latitude: 33.66,
  longitude: -95.55,
  populationContext: 24530,
  populationYear: 2024,
  populationSourceId: "census",
  sourceId: "census",
  sourceVintage: "2024",
};

describe("PlaceSearch", () => {
  it("labels Census results as map context and selects one", async () => {
    const user = userEvent.setup();
    const onSelectPlace = vi.fn();
    render(
      <PlaceSearch
        searchPlaces={vi.fn(async () => [paris])}
        selectedPlaceId={null}
        onSelectPlace={onSelectPlace}
      />,
    );

    expect(
      screen.getByText(/not a global gazetteer or population exposure/i),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Find a U.S. Census place"), "Paris");
    await user.click(screen.getByRole("button", { name: "Find place" }));
    const result = await screen.findByRole("button", {
      name: /Paris.*U\.S\. Census 2024/i,
    });
    await user.click(result);

    expect(onSelectPlace).toHaveBeenCalledWith(paris);
  });
});
