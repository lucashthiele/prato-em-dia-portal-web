import type { ReactNode } from "react";
import { Link } from "react-router";
import { StatusChip } from "../../../shared/ui";
import { deliveryStatus, type Patient } from "../../patients";
import styles from "./PatientRow.module.css";

interface PatientRowProps {
  patient: Patient;
  action?: ReactNode;
}

export function PatientRow({ patient, action }: PatientRowProps) {
  const status = deliveryStatus(patient);
  return (
    <li className={styles.row}>
      <div className={styles.who}>
        <Link className={styles.name} to={`/pacientes/${patient.patientId}`}>
          {patient.patientFullName}
        </Link>
        <span className={styles.email}>{patient.patientEmail}</span>
      </div>
      {status ? <StatusChip status={status} /> : null}
      {action}
    </li>
  );
}
