import { Link } from "react-router";
import { StatusChip } from "../../../shared/ui";
import type { DraftToContinue } from "../api/summary";
import styles from "./DraftsList.module.css";
import section from "./Section.module.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

interface DraftsListProps {
  drafts: DraftToContinue[];
  /** Total de rascunhos em aberto; pode ser maior que a lista. */
  total: number;
}

export function DraftsList({ drafts, total }: DraftsListProps) {
  return (
    <section aria-labelledby="home-drafts">
      <div className={section.head}>
        <h2 id="home-drafts" className={section.title}>
          Rascunhos para continuar
        </h2>
        <Link className={section.more} to="/pacientes?filtro=rascunhos">
          Ver todos
        </Link>
      </div>
      <ul className={section.card}>
        {drafts.map((draft) => (
          <li key={draft.versionId} className={styles.item}>
            <Link className={styles.row} to={`/pacientes/${draft.patientId}/prescricao`}>
              <span className={styles.who}>
                <span className={styles.name}>{draft.patientFullName}</span>
                <span className={styles.meta}>
                  {draft.title} · versão {draft.versionNumber}
                  {draft.updatedAt
                    ? ` · editado em ${dateTime.format(new Date(draft.updatedAt))}`
                    : ""}
                </span>
              </span>
              <StatusChip status="draft" />
            </Link>
          </li>
        ))}
      </ul>
      {total > drafts.length ? (
        <p className={styles.more}>
          Mostrando {drafts.length} de {total} rascunhos em aberto.
        </p>
      ) : null}
    </section>
  );
}
