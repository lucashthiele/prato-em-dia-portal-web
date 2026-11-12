import { ApiError } from "../../../shared/api";
import { Alert, Button, EmptyState, VersionHistory, type Version } from "../../../shared/ui";
import { usePatientPrescriptions, type PrescriptionVersion } from "../api/prescriptions";
import { MealList } from "../components/MealList";
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
  const query = usePatientPrescriptions(patientId);

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
      <EmptyState title="Nenhuma prescrição ainda" icon="file">
        Quando você criar a primeira versão, ela aparece aqui.
      </EmptyState>
    );
  }

  const current = versions.find((v) => v.status === "PUBLISHED");
  const draft = versions.find((v) => v.status === "DRAFT");
  const mode = planningModeLabel(prescription.planningMode);
  const targets = current?.nutritionTargets ?? [];

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
        <Alert tone="warm" title="Há um rascunho não publicado">
          A versão {draft.number} foi criada em {formatDate(draft.createdAt)}. O paciente ainda vê a
          versão vigente no app.
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
          </>
        ) : (
          <EmptyState title="Nenhuma versão publicada" icon="file">
            O paciente só vê a prescrição depois que você publicar uma versão.
          </EmptyState>
        )}
      </section>

      <section className={styles.section} aria-labelledby="history-title">
        <h2 id="history-title" className={styles.title}>
          Histórico de versões
        </h2>
        <VersionHistory versions={history} />
      </section>
    </div>
  );
}
