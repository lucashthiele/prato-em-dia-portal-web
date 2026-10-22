import { Button } from "../../../shared/ui";
import styles from "./Pagination.module.css";

interface PaginationProps {
  /** Base 1. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className={styles.nav} aria-label="Paginação">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </Button>
      <span className={styles.position} aria-live="polite">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </Button>
    </nav>
  );
}
