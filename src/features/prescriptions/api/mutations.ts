import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";
import type { ContentRequest } from "../lib/editor-model";
import type { Prescription } from "./prescriptions";

type PlanningMode = components["schemas"]["PlanningModeRequest"]["planningMode"];

function useRefreshPrescriptions(patientId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["prescriptions", patientId] });
}

/** Cria a prescrição e o rascunho v1 (Q9): sempre com `meals: []`. */
export function useCreatePrescription(patientId: string) {
  const refresh = useRefreshPrescriptions(patientId);
  return useMutation({
    mutationFn: async (planningMode: PlanningMode) => {
      const { data } = await client.POST(
        "/api/v1/nutritionists/me/patients/{patientId}/prescriptions",
        { params: { path: { patientId } }, body: { planningMode, meals: [] } },
      );
      return data;
    },
    onSuccess: refresh,
  });
}

export function useSaveVersion(patientId: string, versionId: string) {
  const refresh = useRefreshPrescriptions(patientId);
  return useMutation({
    mutationFn: async (body: ContentRequest) => {
      const { data } = await client.PUT("/api/v1/prescription-versions/{versionId}", {
        params: { path: { versionId } },
        body,
      });
      return data;
    },
    onSuccess: refresh,
  });
}

export function usePublishVersion(patientId: string) {
  const refresh = useRefreshPrescriptions(patientId);
  return useMutation({
    mutationFn: async (versionId: string) => {
      await client.POST("/api/v1/prescription-versions/{versionId}/publish", {
        params: { path: { versionId } },
      });
    },
    // Sem esperar o refetch: o editor navega para o paciente logo em seguida.
    onSuccess: () => {
      void refresh();
    },
  });
}

export function useArchiveVersion(patientId: string) {
  const refresh = useRefreshPrescriptions(patientId);
  return useMutation({
    mutationFn: async (versionId: string) => {
      await client.POST("/api/v1/prescription-versions/{versionId}/archive", {
        params: { path: { versionId } },
      });
    },
    onSuccess: refresh,
  });
}

/** Descarta um rascunho (Q15). Sendo a única versão, o servidor apaga a prescrição inteira. */
export function useDiscardVersion(patientId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshPrescriptions(patientId);
  return useMutation({
    mutationFn: async (versionId: string) => {
      await client.DELETE("/api/v1/prescription-versions/{versionId}", {
        params: { path: { versionId } },
      });
    },
    // Tira a versão do cache já: a tela seguinte não pode mostrar o rascunho de novo.
    onSuccess: (_data, versionId) => {
      queryClient.setQueryData<Prescription[]>(["prescriptions", patientId], (old) =>
        old
          ?.map((p) => ({ ...p, versions: p.versions?.filter((v) => v.id !== versionId) }))
          .filter((p) => (p.versions?.length ?? 0) > 0),
      );
      void refresh();
    },
  });
}

/** Cria o rascunho copiando a vigente (ou, sem vigente, a última publicada) (Q16, S-06). */
export function useCreateVersion(patientId: string) {
  const refresh = useRefreshPrescriptions(patientId);
  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { data } = await client.POST("/api/v1/prescriptions/{prescriptionId}/versions", {
        params: { path: { prescriptionId } },
      });
      return data;
    },
    // Espera a lista atualizar: o editor procura o rascunho novo nela.
    onSuccess: () => refresh(),
  });
}

export function useUpdatePlanningMode(patientId: string) {
  const refresh = useRefreshPrescriptions(patientId);
  return useMutation({
    mutationFn: async ({
      prescriptionId,
      planningMode,
    }: {
      prescriptionId: string;
      planningMode: PlanningMode;
    }) => {
      await client.PUT("/api/v1/prescriptions/{prescriptionId}/planning-mode", {
        params: { path: { prescriptionId } },
        body: { planningMode },
      });
    },
    onSuccess: refresh,
  });
}

/** Períodos do calendário do paciente: só carrega quando `enabled` (ao abrir o diálogo de publicar). */
export function usePatientCalendar(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["calendar-periods", patientId],
    enabled,
    queryFn: async () => {
      const { data } = await client.GET(
        "/api/v1/nutritionists/me/patients/{patientId}/calendar-periods",
        { params: { path: { patientId } } },
      );
      return data ?? {};
    },
  });
}
