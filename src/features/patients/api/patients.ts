import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, type components, type paths } from "../../../shared/api";

export type Patient = components["schemas"]["RelationshipOutput"];

export type PatientsQuery = NonNullable<
  paths["/api/v1/nutritionists/me/patients"]["get"]["parameters"]["query"]
>;

export interface PatientsPage {
  patients: Patient[];
  /** Total que atende ao filtro aplicado, não o total de pacientes. */
  total: number;
  totalPages: number;
}

export function usePatients(query: PatientsQuery = {}) {
  return useQuery({
    queryKey: ["patients", query],
    // Mantém a página anterior na tela enquanto a nova carrega (busca, filtros, paginação).
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PatientsPage> => {
      const { data } = await client.GET("/api/v1/nutritionists/me/patients", {
        params: { query },
      });
      const patients = data?.content ?? [];
      return {
        patients,
        total: data?.totalElements ?? patients.length,
        totalPages: data?.totalPages ?? 1,
      };
    },
  });
}

export function useResendAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patientId: string) => {
      await client.POST("/api/v1/nutritionists/me/patients/{patientId}/access-email", {
        params: { path: { patientId } },
      });
    },
    // O resumo do Início também conta acessos com falha.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients"] }),
        queryClient.invalidateQueries({ queryKey: ["nutritionist-summary"] }),
      ]),
  });
}
