import type { PreviewManifest } from "../../data/types";
import styles from "./AppFooter.module.css";

type AppFooterProps = {
  manifest: PreviewManifest;
};

export function AppFooter({ manifest }: AppFooterProps) {
  const source = manifest.sources[0];
  const licence = manifest.licences[0];

  return (
    <footer className={styles.footer}>
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
    </footer>
  );
}
