import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import type { TimeRangePreset, TimeRangeSelection } from "../../app/timeRange";
import { BrowseFilters } from "../../features/filters/BrowseFilters";
import type { BrowseFilters as BrowseFiltersState } from "../../state/browseState";
import { Button } from "../ui/Button";
import styles from "./BrowseToolbar.module.css";

const PRESET_LABELS: Record<TimeRangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  full: "Full preview",
};

type BrowseToolbarProps = {
  filters: BrowseFiltersState;
  isUpdating: boolean;
  shareStatus: string;
  onApplyFilters: (filters: BrowseFiltersState) => void;
  onResetFilters: () => void;
  onSearch: (query: string) => void;
  onTimeRangeChange: (selection: TimeRangeSelection) => void;
  onCopyLink: () => void;
};

export function BrowseToolbar({
  filters,
  isUpdating,
  shareStatus,
  onApplyFilters,
  onResetFilters,
  onSearch,
  onTimeRangeChange,
  onCopyLink,
}: BrowseToolbarProps) {
  const filterPanelId = useId();
  const sourceQuery = filters.placeQuery;
  const [searchState, setSearchState] = useState({
    sourceQuery,
    draft: sourceQuery,
  });
  const searchDraft =
    searchState.sourceQuery === sourceQuery ? searchState.draft : sourceQuery;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
    requestAnimationFrame(() => filterButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    filterPanelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFilters();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeFilters, filtersOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(searchDraft.trim());
  }

  function selectTimeRange(value: string) {
    if (value === "custom") {
      const customRange = document.getElementById("activity-custom-range");
      customRange?.click();
      customRange?.focus();
      document.getElementById("activity")?.scrollIntoView({ block: "nearest" });
      return;
    }
    onTimeRangeChange({ kind: "preset", preset: value as TimeRangePreset });
  }

  const timeRangeValue =
    filters.timeRange.kind === "preset" ? filters.timeRange.preset : "custom";

  return (
    <div className={styles.toolbar}>
      <form className={styles.search} role="search" onSubmit={submitSearch}>
        <label className="visually-hidden" htmlFor={`${filterPanelId}-search`}>
          Search earthquake locations
        </label>
        <input
          id={`${filterPanelId}-search`}
          type="search"
          value={searchDraft}
          placeholder="Search earthquake locations…"
          disabled={isUpdating}
          onChange={(event) =>
            setSearchState({ sourceQuery, draft: event.currentTarget.value })
          }
        />
        <Button type="submit" disabled={isUpdating}>
          Search
        </Button>
      </form>

      <label className={styles.timeRange}>
        <span className="visually-hidden">Time range</span>
        <select
          value={timeRangeValue}
          disabled={isUpdating}
          onChange={(event) => selectTimeRange(event.currentTarget.value)}
        >
          {Object.entries(PRESET_LABELS).map(([preset, label]) => (
            <option key={preset} value={preset}>
              {label}
            </option>
          ))}
          <option value="custom">Custom range (timeline)</option>
        </select>
      </label>

      <div className={styles.filterControl}>
        <Button
          ref={filterButtonRef}
          aria-controls={filterPanelId}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Filters
        </Button>
        {filtersOpen ? (
          <div
            ref={filterPanelRef}
            className={styles.filterPanel}
            id={filterPanelId}
            role="dialog"
            aria-label="Earthquake filters"
          >
            <BrowseFilters
              filters={filters}
              isUpdating={isUpdating}
              onApply={(nextFilters) => {
                onApplyFilters(nextFilters);
                closeFilters();
              }}
              onReset={() => {
                onResetFilters();
                closeFilters();
              }}
              onClose={closeFilters}
            />
          </div>
        ) : null}
      </div>

      <Button onClick={onCopyLink}>Copy link</Button>
      <span className={styles.shareStatus} aria-live="polite">
        {shareStatus}
      </span>
    </div>
  );
}
