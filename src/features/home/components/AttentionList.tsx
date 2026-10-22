import { Button } from "../../../shared/ui";
import type { Patient } from "../../patients";
import { PatientRow } from "./PatientRow";
import styles from "./Section.module.css";

interface AttentionListProps {
  patients: Patient[];
  onResend: (patient: Patient) => void;
}

export function AttentionList({ patients, onResend }: AttentionListProps) {
  return (
    <section aria-labelledby="home-attention">
      <h2 id="home-attention" className={styles.title}>
        Precisam de atenção
      </h2>
      <ul className={styles.card}>
        {patients.map((patient) => (
          <PatientRow
            key={patient.relationshipId}
            patient={patient}
            action={
              <Button
                variant="outline"
                size="sm"
                icon="mail"
                aria-label={`Reenviar acesso para ${patient.patientFullName}`}
                onClick={() => onResend(patient)}
              >
                Reenviar acesso
              </Button>
            }
          />
        ))}
      </ul>
    </section>
  );
}
