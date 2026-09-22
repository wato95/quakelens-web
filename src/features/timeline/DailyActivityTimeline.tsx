import {
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  TIME_RANGE_PRESETS,
  formatTimeWindowUtc,
  getCoverageDateBounds,
  getTimeWindowUtcDates,
  isUtcDate,
  timeWindowContains,
  type TimeRangePreset,
  type TimeRangeSelection,
  type TimeWindow,
} from "../../app/timeRange";
import type { CoverageWindow, DailyActivity } from "../../data/types";
import styles from "./DailyActivityTimeline.module.css";

type DailyActivityTimelineProps = {
  activity: DailyActivity[];
  coverage: CoverageWindow;
  timeRangeSelection: TimeRangeSelection;
  timeWindow: TimeWindow;
  isUpdating?: boolean;
  onTimeRangeChange: (selection: TimeRangeSelection) => void;
};

type DraftRange = {
  startDateInclusive: string;
  endDateInclusive: string;
};

type RangeErrors = Partial<Record<keyof DraftRange, string>>;

type RangeFormState = {
  sourceKey: string;
  range: DraftRange;
  errors: RangeErrors;
};

type PointerGesture = {
  pointerId: number;
  startDate: string;
  startX: number;
  moved: boolean;
  target: SVGSVGElement;
};

const PRESET_LABELS: Record<TimeRangePreset, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  full: "Full preview",
};

const CHART_WIDTH = 1_000;
const CHART_HEIGHT = 52;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const DRAG_THRESHOLD_PIXELS = 5;

export function DailyActivityTimeline({
  activity,
  coverage,
  timeRangeSelection,
  timeWindow,
  isUpdating = false,
  onTimeRangeChange,
}: DailyActivityTimelineProps) {
  const titleId = useId();
  const descriptionId = useId();
  const startInputId = useId();
  const endInputId = useId();
  const chart = useMemo(() => makeChart(activity, coverage), [activity, coverage]);
  const coverageBounds = useMemo(() => getCoverageDateBounds(coverage), [coverage]);
  const appliedDates = useMemo(() => getTimeWindowUtcDates(timeWindow), [timeWindow]);
  const formSourceKey = `${timeRangeSelection.kind}:${timeWindow.startTimeInclusive}:${timeWindow.endTimeExclusive}`;
  const [rangeFormState, setRangeFormState] = useState<RangeFormState>({
    sourceKey: formSourceKey,
    range: appliedDates,
    errors: {},
  });
  const formStateIsCurrent = rangeFormState.sourceKey === formSourceKey;
  const draftRange = formStateIsCurrent ? rangeFormState.range : appliedDates;
  const errors = formStateIsCurrent ? rangeFormState.errors : {};
  const [tentativeRange, setTentativeRange] = useState<DraftRange | null>(null);
  const gestureRef = useRef<PointerGesture | null>(null);
  const highestDay = activity.reduce<DailyActivity | null>(
    (highest, day) => (!highest || day.eventCount > highest.eventCount ? day : highest),
    null,
  );

  const displayedSelection = tentativeRange ?? appliedDates;
  const selectionOverlay = makeSelectionOverlay(displayedSelection, coverage);

  function updateDraft(field: keyof DraftRange, value: string) {
    setRangeFormState({
      sourceKey: formSourceKey,
      range: { ...draftRange, [field]: value },
      errors: { ...errors, [field]: undefined },
    });
  }

  function applyExplicitRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDraftRange(draftRange, coverageBounds);
    setRangeFormState({
      sourceKey: formSourceKey,
      range: draftRange,
      errors: nextErrors,
    });
    if (Object.keys(nextErrors).length > 0) return;
    onTimeRangeChange({ kind: "custom", ...draftRange });
  }

  function beginPointerGesture(event: ReactPointerEvent<SVGSVGElement>) {
    if (isUpdating || event.button !== 0) return;
    const date = pointerDate(event, coverage);
    gestureRef.current = {
      pointerId: event.pointerId,
      startDate: date,
      startX: event.clientX,
      moved: false,
      target: event.currentTarget,
    };
    setTentativeRange(normalizeDraftRange(date, date));
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function previewPointerGesture(event: ReactPointerEvent<SVGSVGElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - gesture.startX) >= DRAG_THRESHOLD_PIXELS) {
      gesture.moved = true;
    }
    const endDate = gesture.moved ? pointerDate(event, coverage) : gesture.startDate;
    setTentativeRange(normalizeDraftRange(gesture.startDate, endDate));
  }

  function finishPointerGesture(event: ReactPointerEvent<SVGSVGElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const endDate = gesture.moved ? pointerDate(event, coverage) : gesture.startDate;
    const range = normalizeDraftRange(gesture.startDate, endDate);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    gestureRef.current = null;
    setTentativeRange(null);
    onTimeRangeChange({ kind: "custom", ...range });
  }

  function cancelPointerGesture(event?: ReactPointerEvent<SVGSVGElement>) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    if (event && event.pointerId !== gesture.pointerId) return;
    if (gesture.target.hasPointerCapture?.(gesture.pointerId)) {
      gesture.target.releasePointerCapture(gesture.pointerId);
    }
    gestureRef.current = null;
    setTentativeRange(null);
  }

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
              aria-pressed={
                timeRangeSelection.kind === "preset" &&
                preset === timeRangeSelection.preset
              }
              disabled={isUpdating}
              onClick={() => onTimeRangeChange({ kind: "preset", preset })}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
          <span
            className={styles.customState}
            data-active={timeRangeSelection.kind === "custom"}
          >
            Custom
          </span>
        </div>
        <p className={styles.currentRange} aria-live="polite">
          {isUpdating ? "Updating event range…" : formatTimeWindowUtc(timeWindow)}
        </p>
        <form className={styles.rangeForm} onSubmit={applyExplicitRange} noValidate>
          <div className={styles.dateField}>
            <label htmlFor={startInputId}>Start date (UTC)</label>
            <input
              id={startInputId}
              type="date"
              min={coverageBounds.minimum}
              max={coverageBounds.maximum}
              value={draftRange.startDateInclusive}
              aria-invalid={Boolean(errors.startDateInclusive)}
              aria-describedby={
                errors.startDateInclusive ? `${startInputId}-error` : undefined
              }
              disabled={isUpdating}
              onChange={(event) =>
                updateDraft("startDateInclusive", event.currentTarget.value)
              }
            />
            {errors.startDateInclusive ? (
              <span id={`${startInputId}-error`} className={styles.fieldError}>
                {errors.startDateInclusive}
              </span>
            ) : null}
          </div>
          <div className={styles.dateField}>
            <label htmlFor={endInputId}>End date (UTC, inclusive)</label>
            <input
              id={endInputId}
              type="date"
              min={coverageBounds.minimum}
              max={coverageBounds.maximum}
              value={draftRange.endDateInclusive}
              aria-invalid={Boolean(errors.endDateInclusive)}
              aria-describedby={
                errors.endDateInclusive ? `${endInputId}-error` : undefined
              }
              disabled={isUpdating}
              onChange={(event) =>
                updateDraft("endDateInclusive", event.currentTarget.value)
              }
            />
            {errors.endDateInclusive ? (
              <span id={`${endInputId}-error`} className={styles.fieldError}>
                {errors.endDateInclusive}
              </span>
            ) : null}
          </div>
          <button className={styles.applyRange} type="submit" disabled={isUpdating}>
            Apply UTC range
          </button>
        </form>
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
          {` The visible event range is ${formatTimeWindowUtc(timeWindow)}. Use the labelled UTC date controls to select a range without pointer dragging.`}
        </p>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          aria-label="Pointer-selectable UTC activity timeline"
          aria-disabled={isUpdating}
          tabIndex={0}
          onPointerDown={beginPointerGesture}
          onPointerMove={previewPointerGesture}
          onPointerUp={finishPointerGesture}
          onPointerCancel={cancelPointerGesture}
          onKeyDown={(event) => {
            if (event.key === "Escape") cancelPointerGesture();
          }}
        >
          <rect
            className={styles.selectionOverlay}
            x={selectionOverlay.x}
            y="0"
            width={selectionOverlay.width}
            height={CHART_HEIGHT}
          />
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
          <line
            className={styles.selectionBoundary}
            x1={selectionOverlay.x}
            x2={selectionOverlay.x}
            y1="0"
            y2={CHART_HEIGHT}
          />
          <line
            className={styles.selectionBoundary}
            x1={selectionOverlay.x + selectionOverlay.width}
            x2={selectionOverlay.x + selectionOverlay.width}
            y1="0"
            y2={CHART_HEIGHT}
          />
          <rect
            className={styles.pointerSurface}
            data-testid="timeline-pointer-surface"
            x="0"
            y="0"
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
          />
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
  const coverageDays = Math.max(1, duration / MILLISECONDS_PER_DAY);
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

function makeSelectionOverlay(range: DraftRange, coverage: CoverageWindow) {
  const coverageStart = Date.parse(coverage.eventTimeStartInclusive);
  const coverageEnd = Date.parse(coverage.eventTimeEndExclusive);
  const duration = coverageEnd - coverageStart;
  const start = Math.max(
    coverageStart,
    Date.parse(`${range.startDateInclusive}T00:00:00Z`),
  );
  const end = Math.min(
    coverageEnd,
    Date.parse(`${range.endDateInclusive}T00:00:00Z`) + MILLISECONDS_PER_DAY,
  );
  const x = ((start - coverageStart) / duration) * CHART_WIDTH;
  return {
    x,
    width: Math.max(1, ((end - start) / duration) * CHART_WIDTH),
  };
}

function pointerDate(
  event: ReactPointerEvent<SVGSVGElement>,
  coverage: CoverageWindow,
): string {
  const bounds = event.currentTarget.getBoundingClientRect();
  const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
  const ratio = bounds.width > 0 ? relativeX / bounds.width : 0;
  const start = Date.parse(coverage.eventTimeStartInclusive);
  const end = Date.parse(coverage.eventTimeEndExclusive);
  const dayCount = Math.max(1, Math.ceil((end - start) / MILLISECONDS_PER_DAY));
  const dayIndex = Math.min(dayCount - 1, Math.floor(ratio * dayCount));
  return new Date(start + dayIndex * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

function normalizeDraftRange(first: string, second: string): DraftRange {
  return first <= second
    ? { startDateInclusive: first, endDateInclusive: second }
    : { startDateInclusive: second, endDateInclusive: first };
}

function validateDraftRange(
  range: DraftRange,
  bounds: ReturnType<typeof getCoverageDateBounds>,
): RangeErrors {
  const errors: RangeErrors = {};
  const coverageMessage = `Choose a date from ${bounds.minimum} through ${bounds.maximum}.`;
  if (!isUtcDate(range.startDateInclusive)) {
    errors.startDateInclusive = "Enter a valid UTC start date.";
  } else if (
    range.startDateInclusive < bounds.minimum ||
    range.startDateInclusive > bounds.maximum
  ) {
    errors.startDateInclusive = coverageMessage;
  }
  if (!isUtcDate(range.endDateInclusive)) {
    errors.endDateInclusive = "Enter a valid inclusive UTC end date.";
  } else if (
    range.endDateInclusive < bounds.minimum ||
    range.endDateInclusive > bounds.maximum
  ) {
    errors.endDateInclusive = coverageMessage;
  } else if (
    !errors.startDateInclusive &&
    range.endDateInclusive < range.startDateInclusive
  ) {
    errors.endDateInclusive = "End date must be on or after the start date.";
  }
  return errors;
}

function formatUtcMonth(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(typeof value === "string" ? new Date(value) : value);
}
