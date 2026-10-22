import type { Status } from "../../../shared/ui";
import type { Patient } from "../api/patients";

const DELIVERY_STATUS: Record<string, Status> = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
};

export function deliveryStatus(patient: Patient): Status | undefined {
  return patient.emailDeliveryStatus ? DELIVERY_STATUS[patient.emailDeliveryStatus] : undefined;
}

/** Acesso que o nutricionista precisa acompanhar: envio pendente ou com falha. */
export function hasAccessProblem(patient: Patient): boolean {
  const status = deliveryStatus(patient);
  return status === "pending" || status === "failed";
}

export function mostRecent(patients: Patient[], limit: number): Patient[] {
  return [...patients]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, limit);
}
