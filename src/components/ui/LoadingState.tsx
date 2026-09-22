import styles from "./ui.module.css";

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className={`${styles.card} ${styles.state}`} role="status" aria-live="polite">
      <span className={styles.stateIcon} aria-hidden="true">
        &hellip;
      </span>
      <div className={styles.skeleton}>
        <p className="visually-hidden">{label}</p>
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLine} />
      </div>
    </div>
  );
}
