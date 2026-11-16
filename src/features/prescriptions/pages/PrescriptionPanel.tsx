import { useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../../../shared/api";
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  VersionHistory,
  type PlanningPolicy,
  type Version,
} from "../../../shared/ui";
import { useArchiveVersion, useCreatePrescription, useDiscardVersion } from "../api/mutations";
import { usePatientPrescriptions, type PrescriptionVersion } from "../api/prescriptions";
import { CreatePrescriptionDialog } from "../components/CreatePrescriptionDialog";
import { discardText } from "../lib/discard-text";
import { useNewVersion } from "../lib/useNewVersion";
import { MealList } from "../components/MealList";
import { PlanningModeCard } from "../components/PlanningModeCard";
import { VersionDetails } from "../components/VersionDetails";
import {
  formatDate,
  nutrientLabel,
  planningModeLabel,
  versionDate,
  versionStatus,
} from "../lib/labels";
import styles from "./PrescriptionPanel.module.css";

function summary(version: PrescriptionVersion): string {
  return version.title?.trim() || `Versão ${version.number}`;
}

export function PrescriptionPanel({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const query = usePatientPrescriptions(patientId);
  const create = useCreatePrescription(patientId);
  const archive = useArchiveVersion(patientId);
  const discard = useDiscardVersion(patientId);
  const newVersion = useNewVersion(patientId);
  const [dialog, setDialog] = useState<"create" | "archive" | "discard" | null>(null);

  const conflict = (error: unknown) => error instanceof ApiError && error.status === 409;
  const reload = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        archive.reset();
        discard.reset();
        newVersion.reload();
      }}
    >
      Recarregar
    </Button>
  );

  function confirmCreate(policy: PlanningPolicy) {
    create.mutate(policy, {
      onSuccess: (created) => {
        const first = created?.versions?.[0]?.id;
        setDialog(null);
        if (first) navigate(`/pacientes/${patientId}/prescricao/${first}`);
      },
    });
  }

  if (query.isPending) {
    return (
      <p role="status" aria-busy="true" className={styles.muted}>
        Carregando prescrição…
      </p>
    );
  }
  if (query.isError) {
    return (
      <Alert
        tone="danger"
        title="Não foi possível carregar a prescrição"
        action={
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Tentar de novo
          </Button>
        }
      >
        {query.error instanceof ApiError && query.error.status === 0
          ? "Não foi possível falar com o servidor."
          : "Tente novamente em instantes."}
      </Alert>
    );
  }

  const prescription = query.data[0];
  const versions = [...(prescription?.versions ?? [])].sort(
    (a, b) => (b.number ?? 0) - (a.number ?? 0),
  );
  if (!prescription || versions.length === 0) {
    return (
      <>
        <EmptyState
          title="Nenhuma prescrição ainda"
          icon="file"
          action={
            <Button
              icon="plus"
              onClick={() => {
                create.reset();
                setDialog("create");
              }}
            >
              Criar prescrição
            </Button>
          }
        >
          Crie a prescrição para montar a primeira versão. O paciente só vê o plano depois que você
          publicar.
        </EmptyState>
        <CreatePrescriptionDialog
          open={dialog === "create"}
          loading={create.isPending}
          failed={create.isError}
          onConfirm={confirmCreate}
          onCancel={() => setDialog(null)}
        />
      </>
    );
  }

  const current = versions.find((v) => v.status === "PUBLISHED");
  const draft = versions.find((v) => v.status === "DRAFT");
  const mode = planningModeLabel(prescription.planningMode);
  const targets = current?.nutritionTargets ?? [];
  const everPublished = versions.some((v) => v.status !== "DRAFT");

  const history: Version[] = versions.map((version) => ({
    number: version.number ?? 0,
    summary: summary(version),
    date: versionDate(version),
    status: versionStatus(version),
    current: version.id === current?.id,
    details: <VersionDetails version={version} />,
  }));

  return (
    <div className={styles.panel}>
      {draft ? (
        <Alert
          tone="warm"
          title="Há um rascunho não publicado"
          action={
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/pacientes/${patientId}/prescricao/${draft.id}`)}
              >
                Continuar rascunho
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  discard.reset();
                  setDialog("discard");
                }}
              >
                Descartar rascunho
              </Button>
            </>
          }
        >
          A versão {draft.number} foi criada em {formatDate(draft.createdAt)}. O paciente ainda vê a
          versão vigente no app.
        </Alert>
      ) : null}

      {conflict(discard.error) ? (
        <Alert tone="danger" title="Não foi possível descartar o rascunho" action={reload}>
          Este rascunho mudou em outra aba e não pode mais ser descartado. Recarregue para ver a
          versão atual.
        </Alert>
      ) : discard.isError ? (
        <Alert tone="danger" title="Não foi possível descartar o rascunho">
          Tente novamente em instantes.
        </Alert>
      ) : null}
      {conflict(newVersion.error) ? (
        <Alert tone="danger" title="Não foi possível criar a nova versão" action={reload}>
          Esta prescrição mudou em outra aba. Recarregue antes de criar a nova versão.
        </Alert>
      ) : newVersion.error ? (
        <Alert tone="danger" title="Não foi possível criar a nova versão">
          Tente novamente em instantes.
        </Alert>
      ) : null}

      <section className={styles.section} aria-labelledby="current-title">
        <h2 id="current-title" className={styles.title}>
          Prescrição vigente
        </h2>
        {current ? (
          <>
            <p className={styles.muted}>
              {summary(current)} · publicada em {formatDate(current.publishedAt)}
              {mode ? ` · ${mode.title}` : ""}
            </p>
            {mode ? <p className={styles.muted}>{mode.hint}</p> : null}
            {current.notes ? <p>{current.notes}</p> : null}
            {targets.length > 0 ? (
              <dl className={styles.targets} aria-label="Metas diárias">
                {targets.map((target) => (
                  <div key={target.nutrientCode} className={styles.target}>
                    <dt>{nutrientLabel(target.nutrientCode)}</dt>
                    <dd>
                      {target.amount} {target.unit}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <MealList version={current} />
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  archive.reset();
                  setDialog("archive");
                }}
              >
                Arquivar versão
              </Button>
            </div>
            {conflict(archive.error) ? (
              <Alert tone="danger" title="Não foi possível arquivar a versão" action={reload}>
                Esta versão mudou em outra aba. Recarregue para ver a situação atual.
              </Alert>
            ) : archive.isError ? (
              <Alert tone="danger" title="Não foi possível arquivar a versão">
                Tente novamente em instantes.
              </Alert>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="Sem versão vigente"
            icon="file"
            action={
              newVersion.available ? (
                <Button
                  icon="plus"
                  loading={newVersion.pending}
                  onClick={() => {
                    discard.reset();
                    newVersion.start();
                  }}
                >
                  Nova versão
                </Button>
              ) : undefined
            }
          >
            O paciente só vê a prescrição depois que você publicar uma versão.
          </EmptyState>
        )}
      </section>

      {prescription.id && prescription.planningMode ? (
        <PlanningModeCard
          patientId={patientId}
          prescriptionId={prescription.id}
          mode={prescription.planningMode}
          everPublished={everPublished}
        />
      ) : null}

      <section className={styles.section} aria-labelledby="history-title">
        <h2 id="history-title" className={styles.title}>
          Histórico de versões
        </h2>
        <VersionHistory versions={history} />
      </section>

      <ConfirmDialog
        open={dialog === "archive"}
        title={`Arquivar a versão ${current?.number}?`}
        confirmLabel="Arquivar versão"
        tone="danger"
        loading={archive.isPending}
        onConfirm={() =>
          current?.id && archive.mutate(current.id, { onSettled: () => setDialog(null) })
        }
        onCancel={() => setDialog(null)}
      >
        <p>
          O paciente mantém o plano da semana em curso, mas nenhum plano novo será gerado até você
          publicar outra versão.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "discard" && Boolean(draft)}
        title={`Descartar o rascunho da versão ${draft?.number}?`}
        confirmLabel="Descartar rascunho"
        tone="danger"
        loading={discard.isPending}
        onConfirm={() =>
          draft?.id && discard.mutate(draft.id, { onSettled: () => setDialog(null) })
        }
        onCancel={() => setDialog(null)}
      >
        <p>{discardText(versions)}</p>
      </ConfirmDialog>
    </div>
  );
}
