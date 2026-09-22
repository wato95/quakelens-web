import { describe, expect, it } from "vitest";

import { DEFAULT_BROWSE_STATE } from "./browseState";
import { parseUrlState, serializeUrlState } from "./urlState";

describe("query-string browse state", () => {
  it("round-trips selection, UTC range and supported event filters", () => {
    const state = parseUrlState(
      "?event=us123&from=2026-02-01&to=2026-02-14&minMag=4.5&maxMag=7&minDepth=-2&maxDepth=40&type=earthquake&status=reviewed&review=reviewed&q=South+Pacific",
    );

    expect(parseUrlState(serializeUrlState(state))).toEqual(state);
    expect(state.filters.timeRange).toEqual({
      kind: "custom",
      startDateInclusive: "2026-02-01",
      endDateInclusive: "2026-02-14",
    });
  });

  it("drops malformed values and keeps deployment configuration out of state", () => {
    const state = parseUrlState(
      "?range=forever&from=not-a-date&to=2026-02-30&minMag=NaN&manifest=file:///tmp/private.json",
    );

    expect(state).toEqual(DEFAULT_BROWSE_STATE);
    expect(serializeUrlState(state)).toBe("");
  });

  it("omits the default range and serializes presets deterministically", () => {
    expect(
      serializeUrlState({
        selectedEventId: null,
        filters: {
          ...DEFAULT_BROWSE_STATE.filters,
          timeRange: { kind: "preset", preset: "7d" },
          minimumMagnitude: 5,
        },
      }),
    ).toBe("?range=7d&minMag=5");
  });
});
