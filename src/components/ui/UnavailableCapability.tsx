import styles from "./ui.module.css";

type UnavailableCapabilityProps = {
  title: string;
};

export function UnavailableCapability({ title }: UnavailableCapabilityProps) {
  return (
    <section
      className={`${styles.card} ${styles.state}`}
      aria-labelledby={`capability-${slug(title)}`}
    >
      <span className={styles.stateIcon} aria-hidden="true">
        &ndash;
      </span>
      <div>
        <h3 className={styles.stateTitle} id={`capability-${slug(title)}`}>
          {title}
        </h3>
        <p className={styles.stateBody}>Not available in this preview</p>
      </div>
    </section>
  );
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}
