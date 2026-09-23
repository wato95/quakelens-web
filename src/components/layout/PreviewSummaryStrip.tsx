import type { PreviewEventStatistics } from "../../data/types";
import styles from "./PreviewSummaryStrip.module.css";

type PreviewSummaryStripProps = {
  year: number;
  statistics: PreviewEventStatistics;
};

const numberFormatter = new Intl.NumberFormat("en-GB");

export function PreviewSummaryStrip({ year, statistics }: PreviewSummaryStripProps) {
  const metrics = [
    { label: "Earthquakes", value: statistics.totalEvents },
    { label: "M7+", value: statistics.magnitude7Plus },
    { label: "M6+", value: statistics.magnitude6Plus },
    { label: "M5+", value: statistics.magnitude5Plus },
  ];

  return (
    <section
      className={styles.strip}
      aria-labelledby="preview-summary-heading"
      data-testid="preview-summary"
    >
      <h2 className="visually-hidden" id="preview-summary-heading">
        {year} preview catalogue summary
      </h2>
      <dl className={styles.metrics}>
        {metrics.map((metric, index) => (
          <div className={styles.metric} key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{numberFormatter.format(metric.value)}</dd>
            <span>{index === 0 ? `${year} preview` : "events"}</span>
          </div>
        ))}
      </dl>
    </section>
  );
}
