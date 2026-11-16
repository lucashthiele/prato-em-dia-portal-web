import { useEffect, useState } from "react";
import { Button, TextField } from "../../../shared/ui";
import { useFoodSearch } from "../api/catalog";
import type { FoodRef } from "../lib/editor-model";
import styles from "./Editor.module.css";

interface Props {
  label: string;
  /** Lança um `Error` com a mensagem a mostrar quando o alimento não pode ser usado. */
  onPick: (food: FoodRef) => Promise<void>;
  onCancel: () => void;
}

/** Busca no catálogo: escolher um alimento já devolve a porção mais caseira pré-selecionada. */
export function FoodPicker({ label, onPick, onCancel }: Props) {
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(text), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const search = useFoodSearch(term);
  const searching = term.trim().length >= 2;

  async function pick(food: FoodRef) {
    setBusy(true);
    setFailure(null);
    try {
      await onPick(food);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Não foi possível usar este alimento.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.picker}>
      <TextField
        label={label}
        hint="Digite pelo menos 2 letras."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {failure ? <p className={styles.error}>{failure}</p> : null}
      {searching && search.isPending ? (
        <p role="status" className={styles.hint}>
          Buscando…
        </p>
      ) : null}
      {searching && search.isError ? (
        <p role="alert" className={styles.error}>
          Não foi possível buscar alimentos. Tente de novo.
        </p>
      ) : null}
      {searching && search.data?.length === 0 ? (
        <p role="status" className={styles.hint}>
          Nenhum alimento encontrado.
        </p>
      ) : null}
      {search.data && search.data.length > 0 && searching ? (
        <ul className={styles.results} aria-label="Resultados da busca">
          {search.data.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                className={styles.result}
                disabled={busy}
                onClick={() => pick(food)}
              >
                <span>{food.name}</span>
                {food.detail ? <span className={styles.detail}>{food.detail}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar busca
        </Button>
      </div>
    </div>
  );
}
