import clsx from "clsx";
import { useId } from "react";
import styles from "./PolicyPicker.module.css";

export type PlanningPolicy = "RESTRICTED" | "SUBSTITUTIONS_ONLY" | "FREE";

export interface PolicyPickerProps {
  value: PlanningPolicy;
  onChange?: (value: PlanningPolicy) => void;
  name?: string;
  legend?: string;
}

// Os enums nunca chegam à tela: só estes nomes de produto.
const POLICIES: { id: PlanningPolicy; title: string; body: string }[] = [
  {
    id: "RESTRICTED",
    title: "Seguir o plano",
    body: "O paciente registra exatamente o que foi prescrito.",
  },
  {
    id: "SUBSTITUTIONS_ONLY",
    title: "Permitir substituições",
    body: "O paciente pode trocar um alimento apenas pelas opções que você autorizar em cada item.",
  },
  {
    id: "FREE",
    title: "Montagem livre",
    body: "O paciente monta as refeições da semana a partir da prescrição, adicionando ou removendo itens.",
  },
];

export function PolicyPicker({ value, onChange, name, legend }: PolicyPickerProps) {
  const generated = useId();
  const groupName = name ?? generated;
  return (
    <fieldset className={styles.policy}>
      <legend className={styles.legend}>
        {legend ?? "Como o paciente pode planejar a semana"}
      </legend>
      {POLICIES.map((option) => {
        const selected = option.id === value;
        return (
          // eslint-disable-next-line jsx-a11y/label-has-associated-control -- o input está dentro do label; o texto vem de `option`
          <label key={option.id} className={clsx(styles.option, selected && styles.selected)}>
            <input
              type="radio"
              name={groupName}
              value={option.id}
              checked={selected}
              onChange={() => onChange?.(option.id)}
            />
            <span className={styles.dot} aria-hidden="true" />
            <span>
              <span className={styles.title}>
                {option.title}
                {option.id === "SUBSTITUTIONS_ONLY" ? (
                  <span className={styles.tag}>Sugerido</span>
                ) : null}
              </span>
              <span className={styles.body}>{option.body}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
