import { Button } from "../../../shared/ui";
import { isDirect, withPortion, type Entry } from "../lib/editor-model";
import styles from "./Editor.module.css";

interface Props {
  entry: Entry;
  invalid: boolean;
  onChange: (entry: Entry) => void;
  onRemove: () => void;
  removeLabel: string;
  /** Substituições levam observação opcional (Q12). */
  withNotes?: boolean;
  /** Controles extras (como "Substituições (n)") ao lado dos campos. */
  children?: React.ReactNode;
}

/** Alimento, porção e quantidade: o mesmo seletor para item e substituição. */
export function EntryFields({
  entry,
  invalid,
  onChange,
  onRemove,
  removeLabel,
  withNotes,
  children,
}: Props) {
  const name = entry.food.name;
  const portion = entry.portions[entry.portionIndex];
  return (
    <>
      <div className={styles.entry}>
        <span className={styles.food}>{name}</span>
        <input
          className={`${styles.control} ${styles.amount}`}
          aria-label={`Quantidade de ${name}`}
          inputMode="decimal"
          aria-invalid={invalid || undefined}
          value={entry.amount}
          onChange={(event) => onChange({ ...entry, amount: event.target.value })}
        />
        <span className={styles.unit} aria-hidden="true">
          {isDirect(portion) ? portion.unit : "×"}
        </span>
        <select
          className={styles.control}
          aria-label={`Porção de ${name}`}
          value={entry.portionIndex}
          onChange={(event) => onChange(withPortion(entry, Number(event.target.value)))}
        >
          {entry.portions.map((option, index) => (
            <option key={option.id ?? index} value={index}>
              {option.label}
            </option>
          ))}
        </select>
        {withNotes ? (
          <input
            className={`${styles.control} ${styles.note}`}
            aria-label={`Observação da substituição ${name}`}
            placeholder="Observação (opcional)"
            value={entry.notes}
            onChange={(event) => onChange({ ...entry, notes: event.target.value })}
          />
        ) : null}
        {children}
        <Button variant="ghost" size="sm" aria-label={removeLabel} onClick={onRemove}>
          Remover
        </Button>
      </div>
      {invalid ? <p className={styles.error}>Informe uma quantidade maior que zero.</p> : null}
    </>
  );
}
