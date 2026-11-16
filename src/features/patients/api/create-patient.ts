import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";

export type NewPatient = components["schemas"]["CreatePatientRelationshipRequest"];

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: NewPatient) => {
      const { data } = await client.POST("/api/v1/nutritionists/me/patients", { body });
      return data ?? null;
    },
    onSuccess: (created) => {
      // A página do paciente abre já com o vínculo e o estado do e-mail, sem esperar a consulta.
      if (created?.patientId) queryClient.setQueryData(["patients", created.patientId], created);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients"], refetchType: "inactive" }),
        queryClient.invalidateQueries({ queryKey: ["nutritionist-summary"] }),
      ]);
    },
  });
}
