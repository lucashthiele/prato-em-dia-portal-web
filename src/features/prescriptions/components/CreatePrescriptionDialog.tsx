import { useState } from "react";
import { Alert, ConfirmDialog, PolicyPicker, type PlanningPolicy } from "../../../shared/ui";

interface Props {
  open: boolean;
  loading: boolean;
  failed: boolean;
  onConfirm: (policy: PlanningPolicy) => void;
  onCancel: () => void;
}

/** Q9 e Q14: "Permitir substituições" já vem pré-selecionado, com o selo "Sugerido". */
export function CreatePrescriptionDialog({ open, loading, failed, onConfirm, onCancel }: Props) {
  const [policy, setPolicy] = useState<PlanningPolicy>("SUBSTITUTIONS_ONLY");
  return (
    <ConfirmDialog
      open={open}
      title="Criar prescrição"
      confirmLabel="Criar prescrição"
      loading={loading}
      onConfirm={() => onConfirm(policy)}
      onCancel={onCancel}
    >
      <PolicyPicker value={policy} onChange={setPolicy} />
      {failed ? (
        <Alert tone="danger" title="Não foi possível criar a prescrição">
          Tente novamente em instantes.
        </Alert>
      ) : null}
    </ConfirmDialog>
  );
}
