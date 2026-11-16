import type { components } from "../../../shared/api";

type Calendar = components["schemas"]["Calendar"];

function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Hoje como AAAA-MM-DD no fuso local, para comparar com as datas do calendário. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Dia seguinte ao fim do plano ativo (o que contém hoje), em DD/MM/AAAA; sem plano ativo, `null`. */
export function nextPlanStart(calendar: Calendar | undefined, today = todayIso()): string | null {
  const active = (calendar?.plans ?? []).filter(
    (plan) => plan.start && plan.end && plan.start <= today && today <= plan.end,
  );
  if (active.length === 0) return null;
  // Planos regenerados podem se sobrepor: vale o que termina por último.
  const end = active.map((plan) => plan.end as string).sort()[active.length - 1];
  const next = parseDay(end);
  next.setUTCDate(next.getUTCDate() + 1);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(next);
}

export function publishText(versionNumber: number | undefined, startDate: string | null): string {
  const when = startDate
    ? `no próximo plano do paciente, a partir de ${startDate}`
    : "no próximo plano do paciente";
  return `A versão ${versionNumber} passa a valer ${when}. Para valer antes, o paciente pode regenerar o plano no app.`;
}
