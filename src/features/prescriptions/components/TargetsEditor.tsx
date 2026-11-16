import { TextField } from "../../../shared/ui";
import { TARGET_FIELDS } from "../lib/editor-model";
import styles from "./Editor.module.css";

interface Props {
  targets: Record<string, string>;
  invalid: Set<string>;
  onChange: (targets: Record<string, string>) => void;
}

/** Metas diárias opcionais (Q13): campo vazio é sem meta, e não há cálculo automático. */
export function TargetsEditor({ targets, invalid, onChange }: Props) {
  return (
    <fieldset className={styles.card}>
      <legend className={styles.legend}>Metas diárias</legend>
      <p className={styles.muted}>O paciente vê estas metas no app.</p>
      <div className={styles.fields}>
        {TARGET_FIELDS.map((field) => (
          <TextField
            key={field.code}
            label={`${field.label} (${field.unit})`}
            inputMode="decimal"
            value={targets[field.code] ?? ""}
            error={invalid.has(field.code) ? "Informe um número maior que zero." : undefined}
            onChange={(event) => onChange({ ...targets, [field.code]: event.target.value })}
          />
        ))}
      </div>
    </fieldset>
  );
}
