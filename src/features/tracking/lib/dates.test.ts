import { describe, expect, it } from "vitest";
import { addDays, mondayOf, parseIso, weekDates } from "./dates";

describe("datas do acompanhamento", () => {
  it("a semana vai de segunda a domingo", () => {
    expect(mondayOf("2026-11-18")).toBe("2026-11-16"); // quarta
    expect(mondayOf("2026-11-16")).toBe("2026-11-16"); // segunda
    expect(mondayOf("2026-11-22")).toBe("2026-11-16"); // domingo fica na semana que termina nele
    expect(weekDates("2026-11-16")).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
  });

  it("atravessa mês e ano", () => {
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(mondayOf("2027-01-01")).toBe("2026-12-28");
  });

  it("recusa datas que não existem", () => {
    expect(parseIso("2026-02-30")).toBeNull();
    expect(parseIso("amanhã")).toBeNull();
    expect(parseIso("2026-11-16")).not.toBeNull();
  });
});
