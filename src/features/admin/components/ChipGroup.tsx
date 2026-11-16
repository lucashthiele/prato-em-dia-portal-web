import clsx from "clsx";
import { useId } from "react";
import styles from "./ChipGroup.module.css";

interface ChipGroupProps<T extends string> {
  label: string;
  /** Rótulo da opção "sem filtro". */
  allLabel: string;
  options: { value: T; label: string }[];
  value?: T;
  onChange: (value: T | undefined) => void;
}

/** Grupo de chips de escolha única (`aria-pressed`), no padrão dos filtros de Pacientes. */
export function ChipGroup<T extends string>({
  label,
  allLabel,
  options,
  value,
  onChange,
}: ChipGroupProps<T>) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={styles.group}>
      <span id={id} className={styles.label}>
        {label}
      </span>
      <div className={styles.chips}>
        <Chip pressed={value === undefined} onClick={() => onChange(undefined)}>
          {allLabel}
        </Chip>
        {options.map((option) => (
          <Chip
            key={option.value}
            pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={clsx(styles.chip, pressed && styles.pressed)}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
