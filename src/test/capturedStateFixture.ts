import type { CapturedEventState } from "../data/types";
import { makeEvent } from "./eventFixture";

export function makeCapturedState(
  overrides: Partial<CapturedEventState> = {},
): CapturedEventState {
  const { capturedStateCount, ...event } = makeEvent();
  void capturedStateCount;
  return {
    ...event,
    capturedStateNumber: 1,
    isInitialState: true,
    changedFields: [],
    ...overrides,
  };
}
