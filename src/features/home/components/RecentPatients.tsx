import { Link } from "react-router";
import type { Patient } from "../../patients";
import { PatientRow } from "./PatientRow";
import styles from "./Section.module.css";

export function RecentPatients({ patients }: { patients: Patient[] }) {
  return (
    <section aria-labelledby="home-recent">
      <div className={styles.head}>
        <h2 id="home-recent" className={styles.title}>
          Pacientes recentes
        </h2>
        <Link className={styles.more} to="/pacientes">
          Ver todos
        </Link>
      </div>
      <ul className={styles.card}>
        {patients.map((patient) => (
          <PatientRow key={patient.relationshipId} patient={patient} />
        ))}
      </ul>
    </section>
  );
}
