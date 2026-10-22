import { describe, expect, it } from "vitest";
import { deliveryStatus, hasAccessFailure } from ".";

describe("pacientes", () => {
  it("mapeia o estado de envio do e-mail sem expor o enum", () => {
    expect(deliveryStatus({ emailDeliveryStatus: "FAILED" })).toBe("failed");
    expect(deliveryStatus({ emailDeliveryStatus: "SENT" })).toBe("sent");
    expect(deliveryStatus({ emailDeliveryStatus: "OUTRO" })).toBeUndefined();
    expect(deliveryStatus({})).toBeUndefined();
  });

  it("considera problema só envio com falha", () => {
    expect(hasAccessFailure({ emailDeliveryStatus: "PENDING" })).toBe(false);
    expect(hasAccessFailure({ emailDeliveryStatus: "FAILED" })).toBe(true);
    expect(hasAccessFailure({ emailDeliveryStatus: "SENT" })).toBe(false);
  });
});
