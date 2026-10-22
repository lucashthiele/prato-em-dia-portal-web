import { describe, expect, it } from "vitest";
import { deliveryStatus, hasAccessProblem, mostRecent } from ".";

describe("pacientes", () => {
  it("mapeia o estado de envio do e-mail sem expor o enum", () => {
    expect(deliveryStatus({ emailDeliveryStatus: "FAILED" })).toBe("failed");
    expect(deliveryStatus({ emailDeliveryStatus: "SENT" })).toBe("sent");
    expect(deliveryStatus({ emailDeliveryStatus: "OUTRO" })).toBeUndefined();
    expect(deliveryStatus({})).toBeUndefined();
  });

  it("considera problema só envio pendente ou com falha", () => {
    expect(hasAccessProblem({ emailDeliveryStatus: "PENDING" })).toBe(true);
    expect(hasAccessProblem({ emailDeliveryStatus: "FAILED" })).toBe(true);
    expect(hasAccessProblem({ emailDeliveryStatus: "SENT" })).toBe(false);
  });

  it("ordena do mais novo ao mais antigo e limita", () => {
    const patients = [
      { patientFullName: "A", createdAt: "2026-10-01T00:00:00Z" },
      { patientFullName: "C", createdAt: "2026-10-03T00:00:00Z" },
      { patientFullName: "B", createdAt: "2026-10-02T00:00:00Z" },
    ];
    expect(mostRecent(patients, 2).map((p) => p.patientFullName)).toEqual(["C", "B"]);
  });
});
