import { useQuery } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";

export type Prescription = components["schemas"]["PrescriptionOutput"];
export type PrescriptionVersion = components["schemas"]["VersionOutput"];

/** Prescrições do paciente com o nutricionista logado; o backend só devolve as dele. */
export function usePatientPrescriptions(patientId: string) {
  return useQuery({
    queryKey: ["prescriptions", patientId],
    queryFn: async (): Promise<Prescription[]> => {
      const { data } = await client.GET(
        "/api/v1/nutritionists/me/patients/{patientId}/prescriptions",
        {
          params: { path: { patientId } },
        },
      );
      return data ?? [];
    },
  });
}
