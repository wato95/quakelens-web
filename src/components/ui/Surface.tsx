import type { HTMLAttributes, PropsWithChildren } from "react";

import styles from "./ui.module.css";

type SurfaceProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    variant?: "panel" | "card";
  }
>;

export function Surface({
  children,
  className = "",
  variant = "panel",
  ...props
}: SurfaceProps) {
  const classes = [variant === "panel" ? styles.surface : styles.card, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
