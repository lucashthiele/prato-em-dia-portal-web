import type { components } from "../../../shared/api";

type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";
export type ContentRequest = components["schemas"]["PrescriptionContentRequest"];
type VersionOutput = components["schemas"]["VersionOutput"];
type FoodPortion = components["schemas"]["FoodPortionOutput"];

/** As 4 categorias fixas, na ordem do dia (Q10). O `order` do payload vem desta posição. */
export const MEAL_CATEGORIES: { type: MealType; label: string }[] = [
  { type: "BREAKFAST", label: "Café da manhã" },
  { type: "LUNCH", label: "Almoço" },
  { type: "SNACK", label: "Lanche" },
  { type: "DINNER", label: "Jantar" },
];

/** Metas diárias da Q13: 4 nutrientes, campo vazio = sem meta. */
export const TARGET_FIELDS = [
  { code: "energy_kcal", label: "Energia", unit: "kcal" },
  { code: "protein", label: "Proteína", unit: "g" },
  { code: "carbohydrate", label: "Carboidrato", unit: "g" },
  { code: "lipids", label: "Gordura", unit: "g" },
] as const;

export interface FoodRef {
  id: string;
  name: string;
}

export interface PortionRef {
  id?: string;
  label: string;
  /** Quantidade que a porção representa na unidade dela (1 fatia, 100 g). */
  quantity: number;
  unit: string;
}

/** Um alimento prescrito (item ou substituição) com a porção escolhida. */
export interface Entry {
  key: string;
  food: FoodRef;
  portions: PortionRef[];
  portionIndex: number;
  /** O que a pessoa digitou: múltiplos da porção, ou a quantidade direta em g/ml. */
  amount: string;
  notes: string;
}

export interface DraftItem extends Entry {
  substitutions: Entry[];
}

export interface DraftMeal {
  type: MealType;
  included: boolean;
  name: string;
  time: string;
  notes: string;
  items: DraftItem[];
}

export interface Draft {
  /** Título e observações da versão não têm tela no MVP; seguem como vieram no PUT. */
  title?: string;
  notes?: string;
  meals: DraftMeal[];
  targets: Record<string, string>;
}

let counter = 0;
export function newKey(): string {
  counter += 1;
  return `k${counter}`;
}

/** Porções em gramas ou mililitros são digitadas direto na unidade; as demais, em múltiplos. */
export function isDirect(portion: PortionRef): boolean {
  return ["g", "ml"].includes(portion.unit.trim().toLowerCase());
}

export function parseNumber(text: string): number {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(value) ? NaN : value;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

export function formatAmount(value: number): string {
  return String(round(value)).replace(".", ",");
}

/** A porção mais caseira vem pré-selecionada: a primeira que não é medida em g ou ml (Q11). */
export function defaultPortionIndex(portions: PortionRef[]): number {
  const index = portions.findIndex((portion) => !isDirect(portion));
  return index === -1 ? 0 : index;
}

export function toPortionRefs(portions: FoodPortion[]): PortionRef[] {
  return portions
    .filter((p) => p.active !== false && p.id && p.unit)
    .map((p) => ({
      id: p.id,
      label: p.label ?? `${p.quantity ?? 1} ${p.unit}`,
      quantity: p.quantity ?? 1,
      unit: p.unit as string,
    }));
}

export function newEntry(food: FoodRef, portions: PortionRef[]): Entry {
  const portionIndex = defaultPortionIndex(portions);
  const portion = portions[portionIndex];
  return {
    key: newKey(),
    food,
    portions,
    portionIndex,
    amount: isDirect(portion) ? formatAmount(portion.quantity) : "1",
    notes: "",
  };
}

/** Trocar a porção reinicia a quantidade: 1 múltiplo, ou a quantidade da porção em g/ml. */
export function withPortion(entry: Entry, portionIndex: number): Entry {
  const portion = entry.portions[portionIndex];
  return {
    ...entry,
    portionIndex,
    amount: isDirect(portion) ? formatAmount(portion.quantity) : "1",
  };
}

/** `quantity` e `unit` que o servidor guarda para a quantidade digitada. */
export function entryQuantity(entry: Entry): { quantity: number; unit: string } {
  const portion = entry.portions[entry.portionIndex];
  const typed = parseNumber(entry.amount);
  return {
    quantity: round(isDirect(portion) ? typed : typed * portion.quantity),
    unit: portion.unit,
  };
}

export function entryIsValid(entry: Entry): boolean {
  const typed = parseNumber(entry.amount);
  return Number.isFinite(typed) && typed > 0;
}

export function emptyDraft(): Draft {
  return {
    meals: MEAL_CATEGORIES.map(({ type, label }) => ({
      type,
      included: false,
      name: label,
      time: "",
      notes: "",
      items: [],
    })),
    targets: Object.fromEntries(TARGET_FIELDS.map((field) => [field.code, ""])),
  };
}

/** Monta a entrada da tela a partir de um item salvo; as porções vêm do catálogo. */
export function entryFromSaved(
  saved: {
    foodId?: string;
    foodPortionId?: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  },
  food: FoodRef,
  portions: PortionRef[],
): Entry {
  let list = portions;
  let index = list.findIndex((p) => p.id === saved.foodPortionId);
  if (index === -1) {
    // Porção que saiu do catálogo: mantém o que estava salvo, digitado direto na unidade.
    list = [
      ...list,
      { id: saved.foodPortionId, label: saved.unit ?? "", quantity: 1, unit: saved.unit ?? "" },
    ];
    index = list.length - 1;
    return {
      key: newKey(),
      food,
      portions: list,
      portionIndex: index,
      amount: formatAmount(saved.quantity ?? 0),
      notes: saved.notes ?? "",
    };
  }
  const portion = list[index];
  const quantity = saved.quantity ?? 0;
  return {
    key: newKey(),
    food,
    portions: list,
    portionIndex: index,
    amount: formatAmount(isDirect(portion) ? quantity : quantity / portion.quantity),
    notes: saved.notes ?? "",
  };
}

export interface Catalog {
  food: (id: string | undefined) => FoodRef;
  portions: (foodId: string | undefined) => PortionRef[];
}

export function draftFromVersion(version: VersionOutput | undefined, catalog: Catalog): Draft {
  const draft = emptyDraft();
  draft.title = version?.title;
  draft.notes = version?.notes;
  const meals = [...(version?.meals ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const target of version?.nutritionTargets ?? []) {
    if (target.nutrientCode && target.nutrientCode in draft.targets && target.amount != null) {
      draft.targets[target.nutrientCode] = formatAmount(target.amount);
    }
  }
  for (const meal of draft.meals) {
    // Uma refeição por categoria (Q10): se o servidor trouxer mais, vale a primeira.
    const saved = meals.find((m) => m.mealType === meal.type);
    if (!saved) continue;
    meal.included = true;
    meal.name = saved.name ?? meal.name;
    meal.time = saved.suggestedTime?.slice(0, 5) ?? "";
    meal.notes = saved.notes ?? "";
    meal.items = [...(saved.items ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item) => ({
        ...entryFromSaved(item, catalog.food(item.foodId), catalog.portions(item.foodId)),
        substitutions: (item.substitutions ?? []).map((sub) =>
          entryFromSaved(sub, catalog.food(sub.foodId), catalog.portions(sub.foodId)),
        ),
      }));
  }
  return draft;
}

export function includedMealsWithoutItems(draft: Draft): DraftMeal[] {
  return draft.meals.filter((meal) => meal.included && meal.items.length === 0);
}

export function hasSubstitutions(draft: Draft): boolean {
  return draft.meals.some(
    (meal) => meal.included && meal.items.some((item) => item.substitutions.length > 0),
  );
}

/** Chaves das entradas com quantidade inválida e códigos das metas inválidas. */
export function validate(draft: Draft): { entries: Set<string>; targets: Set<string> } {
  const entries = new Set<string>();
  for (const meal of draft.meals) {
    if (!meal.included) continue;
    for (const item of meal.items) {
      for (const entry of [item, ...item.substitutions]) {
        if (!entryIsValid(entry)) entries.add(entry.key);
      }
    }
  }
  const targets = new Set<string>();
  for (const [code, text] of Object.entries(draft.targets)) {
    if (text.trim() === "") continue;
    const value = parseNumber(text);
    if (!Number.isFinite(value) || value <= 0) targets.add(code);
  }
  return { entries, targets };
}

/** Só as refeições incluídas vão ao servidor; as metas vazias ficam de fora. */
export function toRequest(draft: Draft): ContentRequest {
  const meals = draft.meals.flatMap((meal, index) => {
    if (!meal.included) return [];
    return [
      {
        name: meal.name.trim() || MEAL_CATEGORIES[index].label,
        mealType: meal.type,
        order: index + 1,
        suggestedTime: meal.time ? `${meal.time}:00` : undefined,
        notes: meal.notes.trim() || undefined,
        items: meal.items.map((item, itemIndex) => ({
          foodId: item.food.id,
          foodPortionId: item.portions[item.portionIndex].id,
          ...entryQuantity(item),
          order: itemIndex + 1,
          notes: item.notes.trim() || undefined,
          substitutions: item.substitutions.map((sub) => ({
            foodId: sub.food.id,
            foodPortionId: sub.portions[sub.portionIndex].id,
            ...entryQuantity(sub),
            notes: sub.notes.trim() || undefined,
          })),
        })),
      },
    ];
  });
  const nutritionTargets = TARGET_FIELDS.flatMap((field) => {
    const text = draft.targets[field.code] ?? "";
    return text.trim() === ""
      ? []
      : [{ nutrientCode: field.code, amount: parseNumber(text), unit: field.unit }];
  });
  return { title: draft.title, notes: draft.notes, meals, nutritionTargets };
}
