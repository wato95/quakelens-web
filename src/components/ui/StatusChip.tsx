import type { PropsWithChildren } from "react";

import styles from "./ui.module.css";

type StatusChipProps = PropsWithChildren<{
  preview?: boolean;
}>;

export function StatusChip({ children, preview = false }: StatusChipProps) {
  const classes = [styles.chip, preview ? styles.chipPreview : ""]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
