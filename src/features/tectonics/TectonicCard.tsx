import { useEffect, useReducer, useState } from "react";
import type {
  EventSummary,
  PreviewManifest,
  TectonicClassification,
} from "../../data/types";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { UnavailableCapability } from "../../components/ui/UnavailableCapability";
import {
  confidenceLabels,
  environmentLabels,
  reasonLabels,
} from "./tectonicFormatting";
import styles from "./TectonicCard.module.css";

export type TectonicLoader = (
  eventId: string,
  eventRevisionId: string,
) => Promise<TectonicClassification>;
type LoadState =
  | { status: "loading" }
  | { status: "ready"; result: TectonicClassification }
  | { status: "error" };

export function TectonicCard({
  event,
  manifest,
  load,
}: {
  event: EventSummary;
  manifest: PreviewManifest | null;
  load?: TectonicLoader;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, retry] = useReducer((value) => value + 1, 0);
  const available = manifest?.capabilities.tectonics === "available";
  useEffect(() => {
    if (!available) return;
    let disposed = false;
    Promise.resolve()
      .then(() => {
        if (!load) throw new Error("Tectonic loader unavailable");
        return load(event.eventId, event.eventRevisionId);
      })
      .then((result) => {
        if (
          result.eventId !== event.eventId ||
          result.eventRevisionId !== event.eventRevisionId
        )
          throw new Error("Tectonic revision mismatch");
        if (!disposed) setState({ status: "ready", result });
      })
      .catch((error: unknown) => {
        if (!disposed) {
          console.error("Tectonic data could not be resolved", error);
          setState({ status: "error" });
        }
      });
    return () => {
      disposed = true;
    };
  }, [available, event.eventId, event.eventRevisionId, load, attempt]);
  if (!available) return <UnavailableCapability title="Tectonic setting" />;
  const result = state.status === "ready" ? state.result : null;
  return (
    <section
      className={styles.card}
      aria-labelledby="tectonic-heading"
      data-tectonic-state={result?.classificationStatus.toLowerCase() ?? state.status}
    >
      <h3 id="tectonic-heading">Tectonic setting</h3>
      {state.status === "loading" ? (
        <LoadingState label="Loading tectonic setting" />
      ) : null}
      {state.status === "error" ? (
        <ErrorState
          title="Tectonic data unavailable"
          message="The published result for this event revision could not be verified. Try again."
          onRetry={() => {
            setState({ status: "loading" });
            retry();
          }}
        />
      ) : null}
      {result ? (
        <>
          <p className={styles.summary}>
            {result.classificationStatus === "UNKNOWN"
              ? "Could not be classified confidently"
              : environmentLabels[result.tectonicEnvironment]}
          </p>
          {result.classificationStatus === "CLASSIFIED" ? (
            <p>{confidenceLabels[result.classificationConfidence]}</p>
          ) : (
            <p>
              QuakeLens does not use a simplified fallback when tectonic applicability
              is uncertain.
            </p>
          )}
          <p className={styles.secondary}>
            {result.classificationStatus === "CLASSIFIED"
              ? "Classified with STREC"
              : "Evaluated with STREC"}
          </p>
          <details className={styles.provenance}>
            <summary>Tectonic provenance</summary>
            <dl className="key-value-list">
              <dt>Outcome</dt>
              <dd>
                {result.classificationStatus === "UNKNOWN"
                  ? "Completed scientific uncertainty"
                  : "Classified"}
              </dd>
              <dt>Reason</dt>
              <dd>{reasonLabels[result.classificationReasonCode]}</dd>
              <dt>Method</dt>
              <dd className="mono">{result.classificationMethod}</dd>
              <dt>Regime</dt>
              <dd className="mono">{result.tectonicRegime}</dd>
              <dt>Source domain</dt>
              <dd className="mono">{result.sourceDomain}</dd>
              <dt>Depth domain</dt>
              <dd className="mono">{result.depthDomain}</dd>
              <dt>Classifier</dt>
              <dd className="mono">{result.identity.classifierVersion}</dd>
              <dt>Policy</dt>
              <dd className="mono">{result.identity.policyVersion}</dd>
              <dt>STREC</dt>
              <dd className="mono">{result.identity.strecVersion}</dd>
              <dt>Reference bundle</dt>
              <dd className="mono">{result.identity.referenceBundleVersion}</dd>
              <dt>Classification run</dt>
              <dd className="mono">{result.classificationRunId}</dd>
              <dt>STREC run</dt>
              <dd className="mono">{result.strecRunId}</dd>
              <dt>Revision</dt>
              <dd className="mono">{result.eventRevisionId}</dd>
            </dl>
            {manifest?.tectonics ? (
              <p>
                <a href={manifest.tectonics.validation.url.href}>Validation report</a> ·
                Curated regression; not independent global scientific validation.
              </p>
            ) : null}
            <p>Tectonic classification does not authorize public Allen shaking.</p>
          </details>
        </>
      ) : null}
    </section>
  );
}
