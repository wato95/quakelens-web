import type {
  TectonicEnvironment,
  TectonicReason,
  TectonicClassification,
} from "../../data/types";

export const environmentLabels: Record<TectonicEnvironment, string> = {
  ACTIVE_SHALLOW_CRUST: "Active shallow crust",
  ACTIVE_DEEP: "Active deep",
  STABLE: "Stable tectonic setting",
  SUBDUCTION: "Subduction",
  VOLCANIC: "Volcanic setting",
  UNKNOWN: "Could not be classified confidently",
};
export const confidenceLabels: Record<
  TectonicClassification["classificationConfidence"],
  string
> = {
  HIGH: "High confidence",
  LOW: "Low confidence",
  UNKNOWN: "Confidence not established",
};
export const reasonLabels: Record<TectonicReason, string> = {
  ELIGIBLE_ACTIVE_SHALLOW_INTERIOR: "Published active shallow interior classification",
  STREC_FAILED: "Classifier execution did not complete",
  UNSUPPORTED_STREC: "Classifier version or configuration is unsupported",
  UNKNOWN_REGION: "Tectonic region could not be established",
  INVALID_FEATURES: "Required classifier evidence could not be established",
  OCEANIC: "Published oceanic source domain",
  NON_CONTINENTAL: "Continental source domain could not be established",
  STABLE: "Published stable tectonic region",
  SUBDUCTION: "Published subduction region",
  VOLCANIC: "Published volcanic region",
  INVALID_DEPTH: "Source depth is outside policy support",
  DEEP: "Published deep active classification",
  TRANSITION: "Published evidence falls within a transition",
  REVIEW_POLICY_FAILED: "Source review does not satisfy the applicability policy",
};
