import clsx from "clsx";
import { useId, type InputHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./TextField.module.css";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: IconName;
}

export function TextField({ label, hint, error, icon, className, id, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  return (
    <div className={clsx(styles.field, error && styles.error, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.control}>
        {icon ? <Icon name={icon} size={18} className={styles.icon} /> : null}
        <input
          {...rest}
          id={inputId}
          className={clsx(styles.input, icon && styles.hasIcon)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? hintId : undefined}
        />
      </div>
      {error ? (
        <p id={hintId} className={clsx(styles.hint, styles.hintError)}>
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
