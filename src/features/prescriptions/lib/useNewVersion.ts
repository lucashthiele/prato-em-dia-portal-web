import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useCreateVersion } from "../api/mutations";
import { usePatientPrescriptions } from "../api/prescriptions";

/**
 * "Nova versão" (Q16): disponível quando há prescrição e nenhum rascunho. Cria o rascunho copiando
 * a versão vigente e abre o editor nele.
 */
export function useNewVersion(patientId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = usePatientPrescriptions(patientId);
  const create = useCreateVersion(patientId);

  const prescription = query.data?.[0];
  const versions = prescription?.versions ?? [];
  const available = Boolean(
    prescription?.id && versions.length > 0 && !versions.some((v) => v.status === "DRAFT"),
  );

  return {
    available,
    pending: create.isPending,
    error: create.error,
    start() {
      if (!prescription?.id) return;
      create.mutate(prescription.id, {
        onSuccess: (version) => {
          if (version?.id) navigate(`/pacientes/${patientId}/prescricao/${version.id}`);
        },
      });
    },
    /** Depois de um 409: some o erro e a lista é lida de novo. */
    reload() {
      create.reset();
      void queryClient.invalidateQueries({ queryKey: ["prescriptions", patientId] });
    },
  };
}
