import { useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, ConfirmDialog, EmptyState } from "../../../shared/ui";
import { useMe } from "../../auth";
import {
  hasAccessFailure,
  mostRecent,
  usePatients,
  useResendAccess,
  type Patient,
} from "../../patients";
import { useNutritionistSummary } from "../api/summary";
import { AttentionList } from "../components/AttentionList";
import { DraftsList } from "../components/DraftsList";
import { HomeTiles } from "../components/HomeTiles";
import { RecentPatients } from "../components/RecentPatients";
import styles from "./HomePage.module.css";

const RECENT_LIMIT = 5;

function firstName(fullName?: string) {
  return fullName?.trim().split(/\s+/)[0];
}

function AddPatientButton() {
  const navigate = useNavigate();
  return (
    <Button icon="plus" onClick={() => navigate("/pacientes/novo")}>
      Adicionar paciente
    </Button>
  );
}

export function HomePage() {
  const me = useMe();
  const summary = useNutritionistSummary();
  const patients = usePatients();
  const resend = useResendAccess();
  const [target, setTarget] = useState<Patient | null>(null);
  const [resentTo, setResentTo] = useState<string | null>(null);

  const name = firstName(me.data?.fullName);
  const data = summary.data;
  const needsAttention = patients.data?.patients.filter(hasAccessFailure) ?? [];

  function confirmResend() {
    if (!target?.patientId) return;
    resend.mutate(target.patientId, {
      onSuccess: () => setResentTo(target.patientFullName ?? "o paciente"),
      onSettled: () => setTarget(null),
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>{name ? `Olá, ${name}` : "Olá"}</h1>
        {data && data.activePatients > 0 ? <AddPatientButton /> : null}
      </header>

      {summary.isPending ? (
        <p role="status" aria-busy="true" className={styles.loading}>
          Carregando seu resumo…
        </p>
      ) : summary.isError || !data ? (
        <Alert
          tone="danger"
          title="Não foi possível carregar seu resumo"
          action={
            <Button size="sm" variant="outline" onClick={() => summary.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {summary.error instanceof ApiError && summary.error.status === 0
            ? "Não foi possível falar com o servidor."
            : "Tente novamente em instantes."}
        </Alert>
      ) : data.activePatients === 0 ? (
        <EmptyState title="Nenhum paciente ainda" icon="users" action={<AddPatientButton />}>
          Adicione um paciente para publicar a primeira prescrição e acompanhar a semana dele.
        </EmptyState>
      ) : (
        <>
          <HomeTiles
            activePatients={data.activePatients}
            pendingAccess={data.pendingAccess}
            failedAccess={data.failedAccess}
            openDrafts={data.openDrafts}
          />
          {resentTo ? (
            <Alert tone="success">Acesso reenviado para {resentTo}.</Alert>
          ) : resend.isError ? (
            <Alert tone="danger" title="Não foi possível reenviar o acesso">
              Tente novamente em instantes.
            </Alert>
          ) : null}
          {data.drafts.length > 0 ? (
            <DraftsList drafts={data.drafts} total={data.openDrafts} />
          ) : null}
          {needsAttention.length > 0 ? (
            <AttentionList
              patients={needsAttention}
              onResend={(patient) => {
                setResentTo(null);
                resend.reset();
                setTarget(patient);
              }}
            />
          ) : null}
          {patients.data ? (
            <RecentPatients patients={mostRecent(patients.data.patients, RECENT_LIMIT)} />
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title="Reenviar acesso?"
        confirmLabel="Reenviar acesso"
        loading={resend.isPending}
        onConfirm={confirmResend}
        onCancel={() => setTarget(null)}
      >
        <p>Vamos enviar de novo as instruções de acesso ao app para {target?.patientEmail}.</p>
      </ConfirmDialog>
    </div>
  );
}
