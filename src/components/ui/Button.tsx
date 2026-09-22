import { forwardRef, type ButtonHTMLAttributes } from "react";

import styles from "./ui.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", variant = "default", ...props },
  ref,
) {
  const classes = [
    styles.button,
    variant === "primary" ? styles.buttonPrimary : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button ref={ref} className={classes} type="button" {...props} />;
});
