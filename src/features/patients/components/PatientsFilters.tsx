import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, TextField } from "../../../shared/ui";
import {
  ACCESS_LABEL,
  SORT_LABEL,
  type AccessFilter,
  type PatientFilters,
  type SortKey,
} from "../lib/filters";
import styles from "./PatientsFilters.module.css";

const SEARCH_DEBOUNCE_MS = 300;
const ACCESS_OPTIONS = Object.keys(ACCESS_LABEL) as AccessFilter[];
const SORT_OPTIONS = Object.keys(SORT_LABEL) as SortKey[];

interface PatientsFiltersProps {
  filters: PatientFilters;
  onChange: (patch: Partial<PatientFilters>) => void;
}

export function PatientsFilters({ filters, onChange }: PatientsFiltersProps) {
  const [text, setText] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A URL manda: voltar no histórico ou limpar os filtros também atualiza o campo.
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    setText(filters.q);
  }

  useEffect(() => {
    clearTimeout(timer.current);
  }, [filters.q]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function search(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const q = value.trim();
      if (q !== filters.q) onChange({ q });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className={styles.filters}>
      <div className={styles.search}>
        <TextField
          label="Buscar paciente"
          icon="search"
          type="search"
          placeholder="Buscar por nome ou e-mail"
          autoComplete="off"
          maxLength={180}
          value={text}
          onChange={(event) => search(event.target.value)}
        />
      </div>

      <div className={styles.row}>
        <div role="group" aria-labelledby={`${id}-access`} className={styles.group}>
          <span id={`${id}-access`} className={styles.groupLabel}>
            Acesso ao app
          </span>
          <div className={styles.chips}>
            <Chip
              pressed={filters.access === undefined}
              onClick={() => onChange({ access: undefined })}
            >
              Todos
            </Chip>
            {ACCESS_OPTIONS.map((access) => (
              <Chip
                key={access}
                pressed={filters.access === access}
                onClick={() => onChange({ access })}
              >
                {ACCESS_LABEL[access]}
              </Chip>
            ))}
          </div>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <div role="group" aria-labelledby={`${id}-prescription`} className={styles.group}>
          <span id={`${id}-prescription`} className={styles.groupLabel}>
            Prescrição
          </span>
          <div className={styles.chips}>
            <Chip
              pressed={filters.openDrafts}
              onClick={() => onChange({ openDrafts: !filters.openDrafts })}
            >
              Rascunhos em aberto
            </Chip>
          </div>
        </div>
        <label className={styles.sort}>
          <span>Ordenar por</span>
          <span className={styles.select}>
            <select
              value={filters.sort}
              onChange={(event) => onChange({ sort: event.target.value as SortKey })}
            >
              {SORT_OPTIONS.map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABEL[sort]}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={18} className={styles.caret} />
          </span>
        </label>
      </div>
    </div>
  );
}

interface ChipProps {
  pressed: boolean;
  onClick: () => void;
  children: string;
}

function Chip({ pressed, onClick, children }: ChipProps) {
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
