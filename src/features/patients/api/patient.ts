import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../../../shared/api";

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: ["patients", patientId],
    queryFn: async () => {
      const { data } = await client.GET("/api/v1/nutritionists/me/patients/{patientId}", {
        params: { path: { patientId } },
      });
      return data ?? null;
    },
  });
}

export function useEndRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patientId: string) => {
      await client.DELETE("/api/v1/nutritionists/me/patients/{patientId}/relationship", {
        params: { path: { patientId } },
      });
    },
    // A lista e o resumo do Início deixam de contar o paciente.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients"] }),
        queryClient.invalidateQueries({ queryKey: ["nutritionist-summary"] }),
      ]),
  });
}
