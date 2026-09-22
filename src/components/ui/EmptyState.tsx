import type { ReactNode } from "react";

import { Button } from "./Button";
import styles from "./ui.module.css";

type EmptyStateProps = {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  actionLabel,
  children,
  onAction,
  title,
}: EmptyStateProps) {
  return (
    <div className={`${styles.card} ${styles.state}`} role="status">
      <span className={styles.stateIcon} aria-hidden="true">
        &#8709;
      </span>
      <div>
        <h3 className={styles.stateTitle}>{title}</h3>
        <p className={styles.stateBody}>{children}</p>
      </div>
      {actionLabel && onAction ? (
        <Button className={styles.stateAction} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
