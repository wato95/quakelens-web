import type { CapturedEventState } from "../../data/types";
import {
  formatCoordinates,
  formatDepthKm,
  formatMagnitude,
} from "../events/eventFormatting";

export type CapturedHistoryEntry = {
  state: CapturedEventState;
  title: string;
  descriptions: string[];
};

export function buildCapturedHistory(
  states: CapturedEventState[],
): CapturedHistoryEntry[] {
  const orderedStates = [...states].sort(
    (left, right) => left.capturedStateNumber - right.capturedStateNumber,
  );

  return orderedStates.map((state, index) => {
    const previous = orderedStates[index - 1];
    if (!previous || state.isInitialState) {
      return {
        state,
        title: "Initial captured state",
        descriptions: describeInitialState(state),
      };
    }

    const descriptions = describeChanges(previous, state);
    return {
      state,
      title: `Captured state ${state.capturedStateNumber}`,
      descriptions: descriptions.length > 0 ? descriptions : ["Source update observed"],
    };
  });
}

function describeInitialState(state: CapturedEventState): string[] {
  return [
    `Magnitude ${formatMagnitude(state.magnitude)} ${state.magnitudeType}`,
    `Depth ${formatDepthKm(state.depthKm)}`,
    `Location ${formatCoordinates(state.latitude, state.longitude)}`,
    `Source status ${state.status}`,
    `Review status ${state.reviewStatus}`,
    `Place ${state.placeDescription}`,
  ];
}

function describeChanges(
  previous: CapturedEventState,
  current: CapturedEventState,
): string[] {
  const changedFields = new Set(current.changedFields);
  const descriptions: string[] = [];

  if (changedFields.has("magnitude") && previous.magnitude !== current.magnitude) {
    descriptions.push(
      `Magnitude changed ${formatMagnitude(previous.magnitude)} → ${formatMagnitude(current.magnitude)}`,
    );
  }
  if (
    changedFields.has("magnitude_type") &&
    previous.magnitudeType !== current.magnitudeType
  ) {
    descriptions.push(
      `Magnitude type changed ${previous.magnitudeType} → ${current.magnitudeType}`,
    );
  }
  if (changedFields.has("depth_km") && previous.depthKm !== current.depthKm) {
    descriptions.push(
      `Depth changed ${formatDepthKm(previous.depthKm)} → ${formatDepthKm(current.depthKm)}`,
    );
  }
  if (
    (changedFields.has("longitude") || changedFields.has("latitude")) &&
    (previous.longitude !== current.longitude || previous.latitude !== current.latitude)
  ) {
    descriptions.push(
      `Location changed ${formatCoordinates(previous.latitude, previous.longitude)} → ${formatCoordinates(current.latitude, current.longitude)}`,
    );
  }
  if (changedFields.has("status") && previous.status !== current.status) {
    descriptions.push(`Source status changed ${previous.status} → ${current.status}`);
  }
  if (
    changedFields.has("review_status") &&
    previous.reviewStatus !== current.reviewStatus
  ) {
    descriptions.push(
      `Review status changed ${previous.reviewStatus} → ${current.reviewStatus}`,
    );
  }
  if (
    changedFields.has("place_description") &&
    previous.placeDescription !== current.placeDescription
  ) {
    descriptions.push(
      `Place changed ${previous.placeDescription} → ${current.placeDescription}`,
    );
  }

  return descriptions;
}
