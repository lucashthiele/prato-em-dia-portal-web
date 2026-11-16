import { PatientHeader } from "../../../shared/ui";
import { usePatient } from "../api/patient";
import { deliveryStatus } from "../lib/patients";

/** Cabeçalho do paciente para telas de outras features (como o editor de prescrição), sem ações. */
export function PatientContextHeader({ patientId }: { patientId: string }) {
  const patient = usePatient(patientId);
  const data = patient.data;
  if (!data) return null;
  const delivery = deliveryStatus(data);
  return (
    <PatientHeader
      name={data.patientFullName ?? "Paciente"}
      email={data.patientEmail ?? ""}
      linkStatus={data.relationshipStatus === "ENDED" ? "ended" : "active"}
      accessStatus={
        delivery === "pending" || delivery === "sent" || delivery === "failed"
          ? delivery
          : undefined
      }
    />
  );
}
