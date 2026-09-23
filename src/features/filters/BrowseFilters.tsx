import { useId, useState, type FormEvent } from "react";

import { Button } from "../../components/ui/Button";
import type { BrowseFilters } from "../../state/browseState";
import styles from "./BrowseFilters.module.css";

type BrowseFiltersProps = {
  filters: BrowseFilters;
  isUpdating: boolean;
  onApply: (filters: BrowseFilters) => void;
  onReset: () => void;
  onClose?: () => void;
};

type DraftFilters = {
  minimumMagnitude: string;
  maximumMagnitude: string;
  minimumDepthKm: string;
  maximumDepthKm: string;
};

export function BrowseFilters({
  filters,
  isUpdating,
  onApply,
  onReset,
  onClose,
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
          <p className="eyebrow">Published measurements</p>
          <h2>Filters</h2>
        </div>
        <div className={styles.headingActions}>
          <Button disabled={isUpdating} onClick={onReset}>
            Reset filters
          </Button>
          {onClose ? (
            <Button aria-label="Close filters" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      </div>
      <div className={styles.fields}>
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
      </div>
      {error ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className={styles.apply}
        variant="primary"
        disabled={isUpdating}
        type="submit"
      >
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

function toDraft(filters: BrowseFilters): DraftFilters {
  return {
    minimumMagnitude: displayNumber(filters.minimumMagnitude),
    maximumMagnitude: displayNumber(filters.maximumMagnitude),
    minimumDepthKm: displayNumber(filters.minimumDepthKm),
    maximumDepthKm: displayNumber(filters.maximumDepthKm),
  };
}

function parseDraft(
  draft: DraftFilters,
):
  | Pick<
      BrowseFilters,
      "minimumMagnitude" | "maximumMagnitude" | "minimumDepthKm" | "maximumDepthKm"
    >
  | string {
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
    minimumMagnitude,
    maximumMagnitude,
    minimumDepthKm,
    maximumDepthKm,
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
