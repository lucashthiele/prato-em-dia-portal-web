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

/** Acesso com falha no envio: o único que o nutricionista precisa resolver. */
export function hasAccessFailure(patient: Patient): boolean {
  return deliveryStatus(patient) === "failed";
}
