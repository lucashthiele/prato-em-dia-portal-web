import { useQueries } from "@tanstack/react-query";
import { client } from "../../../shared/api";

export type FoodName = { state: "loading" } | { state: "error" } | { state: "ready"; name: string };

/**
 * Nome dos alimentos pelo catálogo, um pedido por alimento distinto (cache longo).
 * Sai quando a rota de resumo da prescrição (LUC-64) trouxer o nome junto dos itens.
 */
export function useFoodNames(
  foodIds: (string | undefined)[],
): (id: string | undefined) => FoodName {
  const ids = [...new Set(foodIds.filter((id): id is string => Boolean(id)))];
  const results = useQueries({
    queries: ids.map((foodId) => ({
      queryKey: ["food", foodId],
      staleTime: Infinity,
      queryFn: async () => {
        const { data } = await client.GET("/api/v1/foods/{foodId}", {
          params: { path: { foodId } },
        });
        return data?.name ?? "";
      },
    })),
  });
  const byId = new Map(ids.map((id, index) => [id, results[index]]));
  return (id) => {
    const result = id ? byId.get(id) : undefined;
    if (!result || result.isPending) return { state: "loading" };
    if (result.isError || !result.data) return { state: "error" };
    return { state: "ready", name: result.data };
  };
}
