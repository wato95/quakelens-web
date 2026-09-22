import { useState, type FormEvent } from "react";

import { Button } from "../../components/ui/Button";
import type { PlaceSearchResult } from "../../data/types";
import styles from "./PlaceSearch.module.css";

type PlaceSearchProps = {
  searchPlaces: (query: string) => Promise<PlaceSearchResult[]>;
  selectedPlaceId: string | null;
  onSelectPlace: (place: PlaceSearchResult) => void;
  disabled?: boolean;
};

export function PlaceSearch({
  searchPlaces,
  selectedPlaceId,
  onSelectPlace,
  disabled = false,
}: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      setResults(await searchPlaces(query));
      setStatus("ready");
    } catch {
      setResults([]);
      setStatus("error");
    }
  }

  return (
    <div className={styles.search}>
      <form className={styles.form} onSubmit={submit} role="search">
        <label>
          <span>Find a U.S. Census place</span>
          <input
            type="search"
            value={query}
            placeholder="U.S. place name"
            disabled={disabled}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <Button type="submit" disabled={disabled || status === "loading"}>
          {status === "loading" ? "Searching…" : "Find place"}
        </Button>
      </form>
      <p className={styles.note}>
        U.S. Census places (2024) provide map context only. They are not a global
        gazetteer or population exposure results.
      </p>
      <div aria-live="polite">
        {status === "ready" && results.length === 0 ? (
          <p className={styles.message}>No matching U.S. Census places.</p>
        ) : null}
        {status === "error" ? (
          <p className={styles.error} role="alert">
            Census place search is unavailable.
          </p>
        ) : null}
        {results.length > 0 ? (
          <ul className={styles.results} aria-label="U.S. Census place results">
            {results.map((place) => (
              <li key={place.placeId}>
                <button
                  type="button"
                  aria-pressed={place.placeId === selectedPlaceId}
                  onClick={() => onSelectPlace(place)}
                >
                  <strong>{place.name}</strong>
                  <span>
                    {place.admin1Name ?? place.admin1Code} · U.S. Census{" "}
                    {place.sourceVintage}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
