import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../../../shared/api";

/** Intervalo da nova consulta enquanto o e-mail de acesso está pendente. */
export const ACCESS_EMAIL_POLL_MS = 3_000;

export function usePatient(patientId: string, { poll = false }: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: ["patients", patientId],
    // Com `poll`, consulta de novo enquanto o envio do e-mail de acesso está pendente.
    refetchInterval: (query) =>
      poll && query.state.data?.emailDeliveryStatus === "PENDING" ? ACCESS_EMAIL_POLL_MS : false,
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
