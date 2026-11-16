import { useState } from "react";
import { Alert, ConfirmDialog, PolicyPicker, type PlanningPolicy } from "../../../shared/ui";
import { useUpdatePlanningMode } from "../api/mutations";
import { planningModeLabel } from "../lib/labels";
import styles from "./Editor.module.css";

interface Props {
  patientId: string;
  prescriptionId: string;
  mode: PlanningPolicy;
  /** Depois da primeira publicação, a troca passa por confirmação (Q14). */
  everPublished: boolean;
}

/** Modo de planejamento: fica na aba Prescrição, fora do editor, e vale na hora, sem publicar versão. */
export function PlanningModeCard({ patientId, prescriptionId, mode, everPublished }: Props) {
  const update = useUpdatePlanningMode(patientId);
  const [pending, setPending] = useState<PlanningPolicy | null>(null);

  function apply(next: PlanningPolicy) {
    update.mutate({ prescriptionId, planningMode: next }, { onSettled: () => setPending(null) });
  }

  function choose(next: PlanningPolicy) {
    if (next === mode) return;
    if (everPublished) setPending(next);
    else apply(next);
  }

  return (
    <section className={styles.card} aria-labelledby="mode-title">
      <h2 id="mode-title" className={styles.heading}>
        Modo de planejamento
      </h2>
      <PolicyPicker
        name="planning-mode"
        legend="O que o paciente pode fazer ao planejar a semana"
        value={mode}
        onChange={choose}
      />
      {update.isError ? (
        <Alert tone="danger" title="Não foi possível alterar o modo de planejamento">
          O modo continua {planningModeLabel(mode)?.title}. Tente novamente em instantes.
        </Alert>
      ) : null}
      <ConfirmDialog
        open={pending !== null}
        title="Alterar o modo de planejamento?"
        confirmLabel="Alterar modo"
        loading={update.isPending}
        onConfirm={() => pending && apply(pending)}
        onCancel={() => setPending(null)}
      >
        <p>A mudança vale no app do paciente imediatamente, sem publicar nova versão.</p>
      </ConfirmDialog>
    </section>
  );
}
