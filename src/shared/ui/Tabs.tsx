import clsx from "clsx";
import type { KeyboardEvent } from "react";
import styles from "./Tabs.module.css";

export interface TabsProps {
  items: { id: string; label: string; count?: number }[];
  value: string;
  onChange?: (id: string) => void;
  /** Nome acessível do grupo. */
  label?: string;
}

/** Cada aba tem `id="tab-<id>"` e controla o painel `id="panel-<id>"`, que o consumidor renderiza. */
export function Tabs({ items, value, onChange, label }: TabsProps) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = items.findIndex((item) => item.id === value);
    const next = items[(index + step + items.length) % items.length];
    onChange?.(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            type="button"
            role="tab"
            onKeyDown={onKeyDown}
            aria-selected={selected}
            aria-controls={`panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            className={clsx(styles.tab, selected && styles.selected)}
            onClick={() => onChange?.(item.id)}
          >
            {item.label}
            {item.count != null ? <span className={styles.count}>{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
