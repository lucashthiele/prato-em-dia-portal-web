import { Link } from "react-router";
import { Button, StatusChip } from "../../../shared/ui";
import type { Patient } from "../api/patients";
import { deliveryStatus } from "../lib/patients";
import styles from "./PatientsTable.module.css";

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

interface PatientsTableProps {
  patients: Patient[];
  onResend: (patient: Patient) => void;
}

export function PatientsTable({ patients, onResend }: PatientsTableProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Paciente</th>
            <th scope="col">Acesso ao app</th>
            <th scope="col">Adicionado em</th>
            <th scope="col">
              <span className={styles.srOnly}>Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            const status = deliveryStatus(patient);
            const canResend = patient.emailDeliveryStatus !== "SENT" && status !== undefined;
            return (
              <tr key={patient.relationshipId}>
                <td>
                  <Link className={styles.name} to={`/pacientes/${patient.patientId}`}>
                    {patient.patientFullName}
                  </Link>
                  <div className={styles.email}>{patient.patientEmail}</div>
                </td>
                <td>{status ? <StatusChip status={status} /> : null}</td>
                <td className={styles.date}>
                  {patient.createdAt ? date.format(new Date(patient.createdAt)) : ""}
                </td>
                <td className={styles.actions}>
                  {canResend ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon="mail"
                      aria-label={`Reenviar acesso para ${patient.patientFullName}`}
                      onClick={() => onResend(patient)}
                    >
                      Reenviar acesso
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
