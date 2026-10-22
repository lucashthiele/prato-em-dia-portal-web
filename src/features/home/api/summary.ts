import { useQuery } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";

export type DraftToContinue = components["schemas"]["DraftToContinue"];

export const DRAFT_LIMIT = 5;

export interface NutritionistSummary {
  activePatients: number;
  pendingAccess: number;
  failedAccess: number;
  openDrafts: number;
  /** Já ordenados por atualização, do mais recente para o mais antigo. */
  drafts: DraftToContinue[];
}

export function useNutritionistSummary() {
  return useQuery({
    queryKey: ["nutritionist-summary", { draftLimit: DRAFT_LIMIT }],
    queryFn: async (): Promise<NutritionistSummary> => {
      const { data } = await client.GET("/api/v1/nutritionists/me/summary", {
        params: { query: { draftLimit: DRAFT_LIMIT } },
      });
      return {
        activePatients: data?.counts?.activePatients ?? 0,
        pendingAccess: data?.counts?.pendingAccess ?? 0,
        failedAccess: data?.counts?.failedAccess ?? 0,
        openDrafts: data?.counts?.openDrafts ?? 0,
        drafts: data?.drafts ?? [],
      };
    },
  });
}
