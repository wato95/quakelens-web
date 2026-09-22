import { useId, useMemo } from "react";

import {
  TIME_RANGE_PRESETS,
  formatTimeWindowUtc,
  timeWindowContains,
  type TimeRangePreset,
  type TimeWindow,
} from "../../app/timeRange";
import type { CoverageWindow, DailyActivity } from "../../data/types";
import styles from "./DailyActivityTimeline.module.css";

type DailyActivityTimelineProps = {
  activity: DailyActivity[];
  coverage: CoverageWindow;
  timeRangePreset: TimeRangePreset;
  timeWindow: TimeWindow;
  isUpdating?: boolean;
  onTimeRangeChange: (preset: TimeRangePreset) => void;
};

const PRESET_LABELS: Record<TimeRangePreset, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  full: "Full preview",
};

const CHART_WIDTH = 1_000;
const CHART_HEIGHT = 52;

export function DailyActivityTimeline({
  activity,
  coverage,
  timeRangePreset,
  timeWindow,
  isUpdating = false,
  onTimeRangeChange,
}: DailyActivityTimelineProps) {
  const titleId = useId();
  const descriptionId = useId();
  const chart = useMemo(() => makeChart(activity, coverage), [activity, coverage]);
  const highestDay = activity.reduce<DailyActivity | null>(
    (highest, day) => (!highest || day.eventCount > highest.eventCount ? day : highest),
    null,
  );

  return (
    <div className={styles.timeline}>
      <div className={styles.controls}>
        <div
          className={styles.presetGroup}
          role="group"
          aria-label="Visible event range"
        >
          {TIME_RANGE_PRESETS.map((preset) => (
            <button
              key={preset}
              className={styles.preset}
              type="button"
              aria-pressed={preset === timeRangePreset}
              disabled={isUpdating}
              onClick={() => onTimeRangeChange(preset)}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
        <p className={styles.currentRange} aria-live="polite">
          {isUpdating ? "Updating event range…" : formatTimeWindowUtc(timeWindow)}
        </p>
      </div>

      <figure
        className={styles.figure}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <figcaption id={titleId} className="visually-hidden">
          Daily earthquake activity across published preview coverage
        </figcaption>
        <p id={descriptionId} className="visually-hidden">
          {activity.length} published UTC daily activity records.
          {highestDay
            ? ` The highest recorded daily count is ${highestDay.eventCount} on ${highestDay.activityDateUtc}.`
            : " No daily activity records are available."}
          {` The visible event range is ${formatTimeWindowUtc(timeWindow)}.`}
        </p>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {chart.map((bar) => {
            const active = timeWindowContains(
              timeWindow,
              `${bar.day.activityDateUtc}T00:00:00Z`,
            );
            return (
              <rect
                key={bar.day.activityDateUtc}
                className={active ? styles.barActive : styles.bar}
                x={bar.x}
                y={CHART_HEIGHT - bar.height}
                width={bar.width}
                height={bar.height}
                rx="1"
              >
                <title>{`${bar.day.activityDateUtc} UTC: ${bar.day.eventCount} earthquakes; maximum magnitude ${bar.day.maxMagnitude}`}</title>
              </rect>
            );
          })}
        </svg>
        <div className={styles.axis} aria-hidden="true">
          <span>{formatUtcMonth(coverage.eventTimeStartInclusive)}</span>
          <span>Published coverage · UTC</span>
          <span>
            {formatUtcMonth(new Date(Date.parse(coverage.eventTimeEndExclusive) - 1))}
          </span>
        </div>
      </figure>
    </div>
  );
}

function makeChart(activity: DailyActivity[], coverage: CoverageWindow) {
  const start = Date.parse(coverage.eventTimeStartInclusive);
  const end = Date.parse(coverage.eventTimeEndExclusive);
  const duration = Math.max(1, end - start);
  const coverageDays = Math.max(1, duration / (24 * 60 * 60 * 1_000));
  const width = Math.max(1, (CHART_WIDTH / coverageDays) * 0.78);
  const maximumCount = Math.max(1, ...activity.map((day) => day.eventCount));

  return activity
    .map((day) => ({ day, instant: Date.parse(`${day.activityDateUtc}T00:00:00Z`) }))
    .filter(({ instant }) => instant >= start && instant < end)
    .map(({ day, instant }) => ({
      day,
      x: ((instant - start) / duration) * CHART_WIDTH,
      width,
      height: Math.max(1, (day.eventCount / maximumCount) * CHART_HEIGHT),
    }));
}

function formatUtcMonth(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(typeof value === "string" ? new Date(value) : value);
}
