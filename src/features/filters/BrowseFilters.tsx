import { useId, useState, type FormEvent } from "react";

import { Button } from "../../components/ui/Button";
import type { EventFilterOptions } from "../../data/types";
import { DEFAULT_BROWSE_FILTERS, type BrowseFilters } from "../../state/browseState";
import styles from "./BrowseFilters.module.css";

type BrowseFiltersProps = {
  filters: BrowseFilters;
  options: EventFilterOptions;
  isUpdating: boolean;
  onApply: (filters: BrowseFilters) => void;
  onReset: () => void;
};

type DraftFilters = {
  placeQuery: string;
  minimumMagnitude: string;
  maximumMagnitude: string;
  minimumDepthKm: string;
  maximumDepthKm: string;
  eventType: string;
  status: string;
  reviewStatus: string;
};

export function BrowseFilters({
  filters,
  options,
  isUpdating,
  onApply,
  onReset,
}: BrowseFiltersProps) {
  const errorId = useId();
  const sourceKey = filterKey(filters);
  const [draftState, setDraftState] = useState({
    sourceKey,
    draft: toDraft(filters),
  });
  const draft =
    draftState.sourceKey === sourceKey ? draftState.draft : toDraft(filters);
  const [error, setError] = useState("");

  function update(field: keyof DraftFilters, value: string) {
    setDraftState({ sourceKey, draft: { ...draft, [field]: value } });
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseDraft(draft);
    if (typeof parsed === "string") {
      setError(parsed);
      return;
    }
    onApply({ ...filters, ...parsed });
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Published event fields</p>
          <h2>Search and filters</h2>
        </div>
        <Button disabled={isUpdating} onClick={onReset}>
          Reset
        </Button>
      </div>
      <p className={styles.intro}>
        Event text searches the global location description published with each
        earthquake.
      </p>
      <div className={styles.fields}>
        <label className={styles.wideField}>
          <span>Event location text</span>
          <input
            type="search"
            value={draft.placeQuery}
            placeholder="e.g. Alaska or Fiji"
            disabled={isUpdating}
            onChange={(event) => update("placeQuery", event.currentTarget.value)}
          />
        </label>
        <NumberField
          label="Minimum magnitude"
          value={draft.minimumMagnitude}
          disabled={isUpdating}
          onChange={(value) => update("minimumMagnitude", value)}
        />
        <NumberField
          label="Maximum magnitude"
          value={draft.maximumMagnitude}
          disabled={isUpdating}
          onChange={(value) => update("maximumMagnitude", value)}
        />
        <NumberField
          label="Minimum depth (km)"
          value={draft.minimumDepthKm}
          disabled={isUpdating}
          onChange={(value) => update("minimumDepthKm", value)}
        />
        <NumberField
          label="Maximum depth (km)"
          value={draft.maximumDepthKm}
          disabled={isUpdating}
          onChange={(value) => update("maximumDepthKm", value)}
        />
        <SelectField
          label="Event type"
          value={draft.eventType}
          options={options.eventTypes}
          disabled={isUpdating}
          onChange={(value) => update("eventType", value)}
        />
        <SelectField
          label="Source status"
          value={draft.status}
          options={options.statuses}
          disabled={isUpdating}
          onChange={(value) => update("status", value)}
        />
        <SelectField
          label="Review status"
          value={draft.reviewStatus}
          options={options.reviewStatuses}
          disabled={isUpdating}
          onChange={(value) => update("reviewStatus", value)}
        />
      </div>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      <Button variant="primary" disabled={isUpdating} type="submit">
        {isUpdating ? "Updating results…" : "Apply filters"}
      </Button>
    </form>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function toDraft(filters: BrowseFilters): DraftFilters {
  return {
    placeQuery: filters.placeQuery,
    minimumMagnitude: displayNumber(filters.minimumMagnitude),
    maximumMagnitude: displayNumber(filters.maximumMagnitude),
    minimumDepthKm: displayNumber(filters.minimumDepthKm),
    maximumDepthKm: displayNumber(filters.maximumDepthKm),
    eventType: filters.eventType,
    status: filters.status,
    reviewStatus: filters.reviewStatus,
  };
}

function parseDraft(draft: DraftFilters): Omit<BrowseFilters, "timeRange"> | string {
  const minimumMagnitude = parseNumber(draft.minimumMagnitude);
  const maximumMagnitude = parseNumber(draft.maximumMagnitude);
  const minimumDepthKm = parseNumber(draft.minimumDepthKm);
  const maximumDepthKm = parseNumber(draft.maximumDepthKm);
  if (
    minimumMagnitude === false ||
    maximumMagnitude === false ||
    minimumDepthKm === false ||
    maximumDepthKm === false
  ) {
    return "Magnitude and depth filters must be valid finite numbers.";
  }
  if (
    minimumMagnitude !== null &&
    maximumMagnitude !== null &&
    minimumMagnitude > maximumMagnitude
  ) {
    return "Minimum magnitude cannot exceed maximum magnitude.";
  }
  if (
    minimumDepthKm !== null &&
    maximumDepthKm !== null &&
    minimumDepthKm > maximumDepthKm
  ) {
    return "Minimum depth cannot exceed maximum depth.";
  }
  return {
    placeQuery: draft.placeQuery.trim(),
    minimumMagnitude,
    maximumMagnitude,
    minimumDepthKm,
    maximumDepthKm,
    eventType: draft.eventType,
    status: draft.status,
    reviewStatus: draft.reviewStatus,
  };
}

function parseNumber(value: string): number | null | false {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : false;
}

function displayNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

function filterKey(filters: BrowseFilters): string {
  return JSON.stringify(filters);
}

export { DEFAULT_BROWSE_FILTERS };
