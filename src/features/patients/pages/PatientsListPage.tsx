import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, ConfirmDialog, EmptyState } from "../../../shared/ui";
import { usePatients, useResendAccess, type Patient } from "../api/patients";
import { Pagination } from "../components/Pagination";
import { PatientsFilters } from "../components/PatientsFilters";
import { PatientsTable } from "../components/PatientsTable";
import {
  DEFAULT_FILTERS,
  hasActiveFilters,
  parseFilters,
  toApiQuery,
  toSearchParams,
  type PatientFilters,
} from "../lib/filters";
import styles from "./PatientsListPage.module.css";

export function PatientsListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);
  const patients = usePatients(toApiQuery(filters));
  const resend = useResendAccess();
  const [target, setTarget] = useState<Patient | null>(null);
  const [resentTo, setResentTo] = useState<string | null>(null);

  // Qualquer mudança de filtro, busca ou ordem volta para a primeira página.
  function update(patch: Partial<PatientFilters>) {
    const next = { ...filters, page: 1, ...patch };
    setParams(toSearchParams(next), { replace: "q" in patch });
  }

  function confirmResend() {
    if (!target?.patientId) return;
    resend.mutate(target.patientId, {
      onSuccess: () => setResentTo(target.patientFullName ?? "o paciente"),
      onSettled: () => setTarget(null),
    });
  }

  const data = patients.data;
  const filtered = hasActiveFilters(filters);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pacientes</h1>
        <Button icon="plus" onClick={() => navigate("/pacientes/novo")}>
          Adicionar paciente
        </Button>
      </header>

      <PatientsFilters filters={filters} onChange={update} />

      {resentTo ? (
        <Alert tone="success">Acesso reenviado para {resentTo}.</Alert>
      ) : resend.isError ? (
        <Alert tone="danger" title="Não foi possível reenviar o acesso">
          Tente novamente em instantes.
        </Alert>
      ) : null}

      {patients.isPending ? (
        <p role="status" aria-busy="true" className={styles.muted}>
          Carregando pacientes…
        </p>
      ) : patients.isError || !data ? (
        <Alert
          tone="danger"
          title="Não foi possível carregar os pacientes"
          action={
            <Button size="sm" variant="outline" onClick={() => patients.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {patients.error instanceof ApiError && patients.error.status === 0
            ? "Não foi possível falar com o servidor."
            : "Tente novamente em instantes."}
        </Alert>
      ) : data.patients.length === 0 ? (
        data.total > 0 ? (
          <EmptyState
            title="Esta página não existe"
            icon="search"
            action={<Button onClick={() => update({ page: 1 })}>Voltar à primeira página</Button>}
          >
            Os resultados têm menos páginas do que a indicada no endereço.
          </EmptyState>
        ) : filtered ? (
          <EmptyState
            title="Nenhum paciente encontrado"
            icon="search"
            action={
              <Button variant="outline" onClick={() => setParams(toSearchParams(DEFAULT_FILTERS))}>
                Limpar filtros
              </Button>
            }
          >
            Nenhum paciente corresponde à busca e aos filtros escolhidos.
          </EmptyState>
        ) : (
          <EmptyState
            title="Nenhum paciente ainda"
            icon="users"
            action={
              <Button icon="plus" onClick={() => navigate("/pacientes/novo")}>
                Adicionar paciente
              </Button>
            }
          >
            Adicione um paciente para publicar a primeira prescrição e acompanhar a semana dele.
          </EmptyState>
        )
      ) : (
        <>
          <p role="status" className={styles.muted}>
            {data.total === 1 ? "1 paciente" : `${data.total} pacientes`}
          </p>
          <PatientsTable
            patients={data.patients}
            onResend={(patient) => {
              setResentTo(null);
              resend.reset();
              setTarget(patient);
            }}
          />
          <Pagination
            page={filters.page}
            totalPages={data.totalPages}
            onChange={(page) => update({ page })}
          />
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
