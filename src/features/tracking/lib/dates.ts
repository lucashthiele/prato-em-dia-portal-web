/** Datas do acompanhamento são sempre texto `AAAA-MM-DD`, no calendário local, sem fuso. */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `null` quando o texto não é uma data de calendário válida. */
export function parseIso(value: string | null | undefined): Date | null {
  const match = value ? ISO.exec(value) : null;
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toIso(date) === value ? date : null;
}

export function todayIso(): string {
  return toIso(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/** Segunda-feira da semana de calendário que contém a data. */
export function mondayOf(iso: string): string {
  const date = parseIso(iso) ?? new Date();
  const sinceMonday = (date.getDay() + 6) % 7;
  return addDays(toIso(date), -sinceMonday);
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

const WEEKDAY = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function weekdayLabel(iso: string): string {
  return WEEKDAY[(parseIso(iso) ?? new Date()).getDay()];
}

/** `12/04` */
export function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** `12/04/2026` */
export function fullDate(iso: string): string {
  return `${shortDate(iso)}/${iso.slice(0, 4)}`;
}
