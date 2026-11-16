import { Link } from "react-router";
import type { AccountName } from "../api/audit";
import type { AuditEvent } from "../api/audit";
import { auditActionLabel, auditDetailText } from "../lib/labels";
import styles from "./Table.module.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

interface AuditTableProps {
  events: AuditEvent[];
  names: Map<string, AccountName>;
}

function Account({ id, names }: { id?: string; names: Map<string, AccountName> }) {
  if (!id) return <span className={styles.muted}>—</span>;
  const name = names.get(id);
  if (name?.state === "found") {
    return (
      <Link className={styles.name} to={`/admin/usuarios/${id}`}>
        {name.name}
      </Link>
    );
  }
  return (
    <span className={styles.muted}>
      {name?.state === "loading" ? "Carregando…" : "Conta não encontrada"}
    </span>
  );
}

export function AuditTable({ events, names }: AuditTableProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Data e hora</th>
            <th scope="col">Autor</th>
            <th scope="col">Ação</th>
            <th scope="col">Conta afetada</th>
            <th scope="col">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td className={styles.nowrap}>
                {event.occurredAt ? dateTime.format(new Date(event.occurredAt)) : ""}
              </td>
              <td>
                <Account id={event.actorAccountId} names={names} />
              </td>
              <td>{auditActionLabel(event.action, event.details)}</td>
              <td>
                <Account id={event.targetAccountId} names={names} />
              </td>
              <td className={styles.muted}>{auditDetailText(event.details)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
