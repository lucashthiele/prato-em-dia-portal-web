import { Link } from "react-router";
import type { AuditEvent } from "../api/audit";
import { auditAccountName, auditActionLabel, auditDetailText } from "../lib/labels";
import styles from "./Table.module.css";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function Account({ id, name, email }: { id?: string; name?: string; email?: string }) {
  const label = auditAccountName(id, name, email);
  if (!id || !label) return <span className={styles.muted}>—</span>;
  return (
    <Link className={styles.name} to={`/admin/usuarios/${id}`}>
      {label}
    </Link>
  );
}

export function AuditTable({ events }: { events: AuditEvent[] }) {
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
                <Account id={event.actorAccountId} name={event.actorName} />
              </td>
              <td>{auditActionLabel(event.action, event.details)}</td>
              <td>
                <Account
                  id={event.targetAccountId}
                  name={event.targetName}
                  email={event.targetEmail}
                />
              </td>
              <td className={styles.muted}>{auditDetailText(event.details, event.action)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
