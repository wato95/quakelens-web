import { useId, useRef } from "react";

import type { CapturedEventState } from "../../data/types";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { formatCapturedStates, formatUtcDateTime } from "../events/eventFormatting";
import { buildCapturedHistory } from "./capturedHistoryFormatting";
import styles from "./CapturedHistory.module.css";
import { useCapturedHistory } from "./useCapturedHistory";

type CapturedHistoryProps = {
  eventId: string;
  expectedStateCount: number;
  loadCapturedHistory: (eventId: string) => Promise<CapturedEventState[]>;
};

export function CapturedHistory({
  eventId,
  expectedStateCount,
  loadCapturedHistory,
}: CapturedHistoryProps) {
  const contentId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { close, expanded, open, retry, state } = useCapturedHistory(
    eventId,
    loadCapturedHistory,
  );

  const closeHistory = () => {
    close();
    triggerRef.current?.focus();
  };

  return (
    <section className={`detail-section ${styles.section}`} aria-labelledby={contentId}>
      <div className={styles.headingRow}>
        <div>
          <h3 id={contentId}>Captured history</h3>
          <p className={styles.intro}>
            States archived by QuakeLens from the published source.
          </p>
        </div>
        <Button
          ref={triggerRef}
          aria-controls={`${contentId}-content`}
          aria-expanded={expanded}
          onClick={expanded ? closeHistory : open}
        >
          {expanded
            ? "Hide captured history"
            : `View captured history (${formatStateCount(expectedStateCount)})`}
        </Button>
      </div>

      {expanded ? (
        <div className={styles.content} id={`${contentId}-content`}>
          {state.status === "loading" ? (
            <LoadingState label="Loading captured event-state history" />
          ) : null}
          {state.status === "error" ? (
            <ErrorState
              title="Captured history unavailable"
              message={state.message}
              onRetry={retry}
            />
          ) : null}
          {state.status === "ready" ? (
            <CapturedHistoryStates
              expectedStateCount={expectedStateCount}
              states={state.states}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CapturedHistoryStates({
  expectedStateCount,
  states,
}: {
  expectedStateCount: number;
  states: CapturedEventState[];
}) {
  const entries = buildCapturedHistory(states);
  const countMatches = states.length === expectedStateCount;

  return (
    <>
      <p className={styles.count}>
        {formatCapturedStates(states.length)} loaded
        {countMatches
          ? null
          : `; published event summary reports ${expectedStateCount}`}
      </p>
      {!countMatches ? (
        <p className={styles.reconciliation} role="status">
          The returned captured-state count does not match the published event summary.
          Both values are shown without adjustment.
        </p>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState title="No captured states returned">
          The preview query returned no captured states for this event.
        </EmptyState>
      ) : (
        <ol className={styles.timeline} aria-label="Captured event states">
          {entries.map((entry) => (
            <li
              className={styles.entry}
              key={`${entry.state.eventRevisionId}-${entry.state.capturedStateNumber}`}
            >
              <div className={styles.marker} aria-hidden="true" />
              <div className={styles.entryBody}>
                <div className={styles.entryHeading}>
                  <h4>{entry.title}</h4>
                  <span>State {entry.state.capturedStateNumber}</span>
                </div>
                <p className={styles.timestamp}>
                  Source updated{" "}
                  <time dateTime={entry.state.sourceUpdatedAt}>
                    {formatUtcDateTime(entry.state.sourceUpdatedAt)}
                  </time>
                </p>
                <ul className={styles.changes}>
                  {entry.descriptions.map((description) => (
                    <li key={description}>{description}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      )}
      {entries.length === 1 ? (
        <p className={styles.singleState}>
          Only the initial captured state is published for this event.
        </p>
      ) : null}
    </>
  );
}

function formatStateCount(count: number): string {
  return `${count.toLocaleString("en-GB")} ${count === 1 ? "state" : "states"}`;
}
