import { useEffect, useRef, useState } from "react";
import { TextField } from "../../../shared/ui";
import type { UserFilters } from "../lib/filters";
import type { Role } from "../lib/labels";
import { ChipGroup } from "./ChipGroup";
import styles from "../pages/Page.module.css";

const SEARCH_DEBOUNCE_MS = 300;
const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "NUTRITIONIST", label: "Nutricionistas" },
  { value: "PATIENT", label: "Pacientes" },
  { value: "ADMIN", label: "Administradores" },
];
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Ativas" },
  { value: "INACTIVE", label: "Desativadas" },
] as const;

interface UsersFiltersProps {
  filters: UserFilters;
  onChange: (patch: Partial<UserFilters>) => void;
}

export function UsersFilters({ filters, onChange }: UsersFiltersProps) {
  const [text, setText] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
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
          label="Buscar usuário"
          icon="search"
          type="search"
          placeholder="Buscar por nome ou e-mail"
          autoComplete="off"
          maxLength={180}
          value={text}
          onChange={(event) => search(event.target.value)}
        />
      </div>
      <ChipGroup
        label="Papel"
        allLabel="Todos"
        options={ROLE_OPTIONS}
        value={filters.role}
        onChange={(role) => onChange({ role })}
      />
      <ChipGroup
        label="Situação"
        allLabel="Todas"
        options={[...STATUS_OPTIONS]}
        value={filters.status}
        onChange={(status) => onChange({ status })}
      />
    </div>
  );
}
