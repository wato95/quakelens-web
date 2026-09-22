import { Button } from "./Button";
import styles from "./ui.module.css";

type ErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry, title }: ErrorStateProps) {
  return (
    <div className={`${styles.card} ${styles.state}`} role="alert">
      <span className={`${styles.stateIcon} ${styles.errorIcon}`} aria-hidden="true">
        !
      </span>
      <div>
        <h3 className={styles.stateTitle}>{title}</h3>
        <p className={styles.stateBody}>{message}</p>
      </div>
      {onRetry ? (
        <Button className={styles.stateAction} onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
