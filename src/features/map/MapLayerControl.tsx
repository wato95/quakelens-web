import type { PreviewManifest } from "../../data/types";
import { Button } from "../../components/ui/Button";
import styles from "./MapLayerControl.module.css";

export function MapLayerControl({
  manifest,
  enabled,
  state,
  onToggle,
  onRetry,
}: {
  manifest: PreviewManifest;
  enabled: boolean;
  state: "loading" | "ready" | "error";
  onToggle: (enabled: boolean) => void;
  onRetry: () => void;
}) {
  const reference = manifest.plateBoundaries;
  if (!reference) return null;
  const source = manifest.sources.find(
    (entry) => entry.sourceId === reference.provenance.sourceId,
  );
  const licence = manifest.licences.find(
    (entry) => entry.licenceId === reference.provenance.licenceId,
  );
  return (
    <div className={`${styles.control} map-overlay-card`}>
      <fieldset>
        <legend>Map layers</legend>
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
          />
          Plate boundaries
        </label>
      </fieldset>
      {state === "loading" ? <p role="status">Loading plate boundaries…</p> : null}
      {state === "error" ? (
        <div role="status">
          <p>Plate boundaries unavailable</p>
          <Button onClick={onRetry}>Retry plate boundaries</Button>
        </div>
      ) : null}
      <details>
        <summary>PB2002 source and licence</summary>
        <p>{source?.attribution}</p>
        {source ? (
          <a href={source.sourceUrl} target="_blank" rel="noreferrer">
            Pinned PB2002 source
          </a>
        ) : null}
        {licence ? (
          <p>
            <a href={licence.licenceUrl} target="_blank" rel="noreferrer">
              {licence.name}
            </a>{" "}
            — {licence.attributionRequirements}
          </p>
        ) : null}
        <p>Cartographic context only; separate from STREC/Slab2 classifier evidence.</p>
      </details>
    </div>
  );
}
