import type { ReactNode } from "react";
import styles from "./PatientHeader.module.css";
import { StatusChip } from "./StatusChip";

export interface PatientHeaderProps {
  name: string;
  email: string;
  linkStatus?: "active" | "ended";
  accessStatus?: "pending" | "sent" | "failed";
  description?: ReactNode;
  /** No máximo uma ação `primary`. */
  actions?: ReactNode;
}

/** Cabeçalho obrigatório de toda tela de paciente: evita erro de autoria. */
export function PatientHeader({
  name,
  email,
  linkStatus = "active",
  accessStatus,
  description,
  actions,
}: PatientHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.id}>
        <h1 className={styles.name}>{name}</h1>
        <div className={styles.meta}>
          <span>{email}</span>
          <StatusChip status={linkStatus} />
          {accessStatus ? <StatusChip status={accessStatus} /> : null}
        </div>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
