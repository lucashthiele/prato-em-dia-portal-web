export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABEL: Record<MealType, string> = {
  BREAKFAST: "Café da manhã",
  LUNCH: "Almoço",
  SNACK: "Lanche",
  DINNER: "Jantar",
};

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatAmount(amount: number | undefined, unit: string | undefined): string {
  if (amount == null) return "—";
  return `${number.format(amount)}${unit ? ` ${unit}` : ""}`;
}

/** Ordem e rótulos das metas diárias (Q13). */
export const NUTRIENTS = [
  { code: "energy_kcal", label: "Energia" },
  { code: "protein", label: "Proteína" },
  { code: "carbohydrate", label: "Carboidrato" },
  { code: "lipids", label: "Gordura" },
] as const;
