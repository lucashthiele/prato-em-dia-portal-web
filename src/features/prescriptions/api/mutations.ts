import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";
import type { ContentRequest } from "../lib/editor-model";

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
