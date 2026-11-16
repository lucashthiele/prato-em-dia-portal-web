import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { client } from "../../../shared/api";
import {
  newEntry,
  toPortionRefs,
  type Entry,
  type FoodRef,
  type PortionRef,
} from "../lib/editor-model";

/** Porções do alimento no catálogo, em cache longo (rota de portions, Q11). */
export function fetchPortions(queryClient: QueryClient, foodId: string): Promise<PortionRef[]> {
  return queryClient.fetchQuery({
    queryKey: ["food-portions", foodId],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await client.GET("/api/v1/foods/{foodId}/portions", {
        params: { path: { foodId } },
      });
      return toPortionRefs(data ?? []);
    },
  });
}

/** Mesma chave de `useFoodNames`: o nome é buscado uma vez por alimento. */
export async function fetchFood(queryClient: QueryClient, foodId: string): Promise<FoodRef> {
  const name = await queryClient.fetchQuery({
    queryKey: ["food", foodId],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await client.GET("/api/v1/foods/{foodId}", {
        params: { path: { foodId } },
      });
      return data?.name ?? "";
    },
  });
  return { id: foodId, name };
}

export interface FoodOption extends FoodRef {
  detail?: string;
}

/** Busca no catálogo (a rota exige texto pesquisável, por isso o mínimo de 2 caracteres). */
export function useFoodSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ["foods", "search", q],
    enabled: q.length >= 2,
    staleTime: 60_000,
    queryFn: async (): Promise<FoodOption[]> => {
      const { data } = await client.GET("/api/v1/foods", {
        params: { query: { q, size: 8 } },
      });
      return (data?.content ?? []).flatMap((food) =>
        food.id && food.name
          ? [{ id: food.id, name: food.name, detail: food.brand ?? food.category }]
          : [],
      );
    },
  });
}

/** Monta a entrada de um alimento recém-escolhido: busca as porções e pré-seleciona a mais caseira. */
export function useMakeEntry() {
  const queryClient = useQueryClient();
  return async (food: FoodRef): Promise<Entry> => {
    let portions: PortionRef[];
    try {
      portions = await fetchPortions(queryClient, food.id);
    } catch {
      throw new Error("Não foi possível carregar as porções deste alimento. Tente de novo.");
    }
    if (portions.length === 0) {
      throw new Error("Este alimento não tem porções cadastradas e não pode ser prescrito.");
    }
    return newEntry(food, portions);
  };
}
