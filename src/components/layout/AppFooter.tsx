import type { PreviewManifest } from "../../data/types";
import styles from "./AppFooter.module.css";

type AppFooterProps = {
  manifest: PreviewManifest;
};

export function AppFooter({ manifest }: AppFooterProps) {
  const source =
    manifest.sources.find((entry) => entry.sourceId === "usgs_earthquakes") ??
    manifest.sources[0];
  const licence = manifest.licences.find(
    (entry) => entry.licenceId === source?.licenceId,
  );
  const reference = manifest.plateBoundaries;
  const boundarySource = manifest.sources.find(
    (entry) => entry.sourceId === reference?.provenance.sourceId,
  );
  const boundaryLicence = manifest.licences.find(
    (entry) => entry.licenceId === reference?.provenance.licenceId,
  );

  return (
    <footer className={styles.footer} role="region" aria-label="Data and references">
      <div className={styles.product}>
        <span>QuakeLens V1</span>
        <span>{manifest.includedCoverage.annualPartition} browser preview</span>
        <span className="mono">{manifest.previewBuildId}</span>
      </div>
      <div className={styles.links}>
        {source ? (
          <a href={source.sourceUrl} rel="noreferrer" target="_blank">
            {source.provider}
          </a>
        ) : null}
        {licence ? (
          <a href={licence.licenceUrl} rel="noreferrer" target="_blank">
            Source licence
          </a>
        ) : null}
      </div>
      {reference ? (
        <details className={styles.reference}>
          <summary>PB2002 source and licence</summary>
          <p>{boundarySource?.attribution}</p>
          {boundarySource ? (
            <a href={boundarySource.sourceUrl} target="_blank" rel="noreferrer">
              Pinned PB2002 source
            </a>
          ) : null}
          {boundaryLicence ? (
            <p>
              <a href={boundaryLicence.licenceUrl} target="_blank" rel="noreferrer">
                {boundaryLicence.name}
              </a>{" "}
              — {boundaryLicence.attributionRequirements}
            </p>
          ) : null}
          <p>
            Cartographic context only; separate from STREC/Slab2 classifier evidence.
          </p>
        </details>
      ) : null}
    </footer>
  );
}
