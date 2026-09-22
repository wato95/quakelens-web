import type { InputHTMLAttributes } from "react";

import styles from "./ui.module.css";

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const classes = [styles.input, className].filter(Boolean).join(" ");

  return <input className={classes} {...props} />;
}
