import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";

export type Patient = components["schemas"]["RelationshipOutput"];

// O backend ainda não filtra nem ordena a listagem (LUC-57); o portal carrega uma página
// grande e trabalha sobre ela.
export const PATIENTS_PAGE_SIZE = 50;

export interface PatientsPage {
  patients: Patient[];
  total: number;
  /** Há pacientes além da página carregada, então contagens derivadas dela são parciais. */
  partial: boolean;
}

export function usePatients() {
  return useQuery({
    queryKey: ["patients", { page: 0, size: PATIENTS_PAGE_SIZE }],
    queryFn: async (): Promise<PatientsPage> => {
      const { data } = await client.GET("/api/v1/nutritionists/me/patients", {
        params: { query: { page: 0, size: PATIENTS_PAGE_SIZE } },
      });
      const patients = data?.content ?? [];
      return {
        patients,
        total: data?.totalElements ?? patients.length,
        partial: (data?.totalPages ?? 1) > 1,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}
