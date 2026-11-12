import type { Status } from "../../../shared/ui";
import type { PrescriptionVersion } from "../api/prescriptions";

/** Enums do backend nunca chegam à tela: sempre passam por aqui. */
const PLANNING_MODE: Record<string, [string, string]> = {
  RESTRICTED: ["Seguir o plano", "O paciente registra exatamente o que foi prescrito."],
  SUBSTITUTIONS_ONLY: [
    "Permitir substituições",
    "O paciente pode trocar um alimento apenas pelas opções que você autorizou.",
  ],
  FREE: [
    "Montagem livre",
    "O paciente monta as refeições da semana a partir da prescrição, adicionando ou removendo itens.",
  ],
};

const MEAL_TYPE: Record<string, string> = {
  BREAKFAST: "Café da manhã",
  LUNCH: "Almoço",
  SNACK: "Lanche",
  DINNER: "Jantar",
};

const VERSION_STATUS: Record<string, Status> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
};

const NUTRIENT: Record<string, string> = {
  energy_kcal: "Energia",
  protein: "Proteínas",
  carbohydrate: "Carboidratos",
  lipids: "Gorduras",
  dietary_fiber: "Fibras",
};

export function planningModeLabel(
  mode: string | undefined,
): { title: string; hint: string } | null {
  const entry = mode ? PLANNING_MODE[mode] : undefined;
  return entry ? { title: entry[0], hint: entry[1] } : null;
}

export function mealTypeLabel(type: string | undefined): string | undefined {
  return type ? MEAL_TYPE[type] : undefined;
}

export function versionStatus(version: PrescriptionVersion): "draft" | "published" | "archived" {
  const status = version.status ? VERSION_STATUS[version.status] : undefined;
  return (status ?? "archived") as "draft" | "published" | "archived";
}

export function nutrientLabel(code: string | undefined): string {
  if (!code) return "";
  return NUTRIENT[code] ?? code.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

// Só as unidades contáveis conhecidas variam no plural; o resto (g, ml, ...) segue como veio.
const PLURAL: Record<string, string> = {
  unidade: "unidades",
  fatia: "fatias",
  colher: "colheres",
  xícara: "xícaras",
  copo: "copos",
  porção: "porções",
};

export function formatQuantity(quantity: number | undefined, unit: string | undefined): string {
  if (quantity == null) return unit ?? "";
  const label = unit && quantity > 1 ? (PLURAL[unit] ?? unit) : unit;
  return `${number.format(quantity)}${label ? ` ${label}` : ""}`;
}

export function formatDate(value: string | undefined): string {
  return value ? date.format(new Date(value)) : "";
}

/** Data que marca a versão na história: publicação, ou criação se ainda é rascunho. */
export function versionDate(version: PrescriptionVersion): string {
  return formatDate(version.publishedAt ?? version.createdAt);
}
