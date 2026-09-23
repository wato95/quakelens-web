import {
  getActiveMagnitudeQuickFilter,
  type MagnitudeQuickFilter,
} from "../../state/browseState";
import type { BrowseFilters } from "../../state/browseState";
import styles from "./MagnitudeQuickFilters.module.css";

const OPTIONS: Array<{ value: MagnitudeQuickFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "m5", label: "M5+" },
  { value: "m6", label: "M6+" },
  { value: "m7", label: "M7+" },
];

type MagnitudeQuickFiltersProps = {
  filters: BrowseFilters;
  disabled?: boolean;
  onChange: (value: MagnitudeQuickFilter) => void;
};

export function MagnitudeQuickFilters({
  filters,
  disabled = false,
  onChange,
}: MagnitudeQuickFiltersProps) {
  const active = getActiveMagnitudeQuickFilter(filters);

  return (
    <div
      className={`${styles.control} map-overlay-card`}
      role="group"
      aria-label="Minimum magnitude quick filter"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={active === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
