import { describe, expect, it } from "vitest";

import {
  formatCapturedStates,
  formatCoordinates,
  formatDepthKm,
  formatMagnitude,
  formatUtcDateTime,
} from "./eventFormatting";

describe("event formatting", () => {
  it("formats published instants explicitly in UTC", () => {
    expect(formatUtcDateTime("2026-08-31T12:03:04.000Z")).toBe(
      "31 Aug 2026, 12:03:04 UTC",
    );
  });

  it("formats scientific values with explicit units and directions", () => {
    expect(formatMagnitude(6.24)).toBe("6.2");
    expect(formatDepthKm(8.14)).toBe("8.1 km");
    expect(formatCoordinates(35.2, -120.5)).toBe("35.2000° N, 120.5000° W");
  });

  it("uses captured-state wording without implying complete source history", () => {
    expect(formatCapturedStates(1)).toBe("1 captured state");
    expect(formatCapturedStates(2)).toBe("2 captured states");
  });
});
