import { useSearchParams } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, EmptyState, TextField } from "../../../shared/ui";
import { useAuditEvents } from "../api/audit";
import { AuditTable } from "../components/AuditTable";
import { Pagination } from "../components/Pagination";
import {
  AUDIT_ACTION_FILTERS,
  auditFiltersToParams,
  auditFiltersToQuery,
  DEFAULT_AUDIT_FILTERS,
  hasActiveAuditFilters,
  parseAuditFilters,
  type AuditFilters,
} from "../lib/filters";
import { auditAccountName } from "../lib/labels";
import styles from "./Page.module.css";

export function AuditPage() {
  const [params, setParams] = useSearchParams();
  const filters = parseAuditFilters(params);
  const audit = useAuditEvents(auditFiltersToQuery(filters));
  const events = audit.data?.events ?? [];

  function update(patch: Partial<AuditFilters>) {
    setParams(auditFiltersToParams({ ...filters, page: 1, ...patch }));
  }

  const data = audit.data;
  // O nome da conta filtrada vem dos próprios eventos (S-09); sem eventos, cai no id curto.
  const targetEvent = events.find((event) => event.targetAccountId === filters.targetId);
  const targetLabel = auditAccountName(
    filters.targetId,
    targetEvent?.targetName,
    targetEvent?.targetEmail,
  );
  const invalidRange =
    (filters.from !== "" && filters.to !== "" && filters.from > filters.to) ||
    (audit.error instanceof ApiError && audit.error.code === "AUDIT_INVALID_FILTER");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Auditoria</h1>
      </header>

      <div className={styles.filters}>
        <div className={styles.dates}>
          <TextField
            label="De"
            type="date"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
          />
          <TextField
            label="Até"
            type="date"
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </div>
        <label className={styles.select}>
          Ação
          <select
            value={filters.action ?? ""}
            onChange={(event) =>
              update({
                action: (event.target.value || undefined) as AuditFilters["action"],
              })
            }
          >
            <option value="">Todas</option>
            {AUDIT_ACTION_FILTERS.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </label>
        {hasActiveAuditFilters(filters) ? (
          <Button
            variant="ghost"
            onClick={() => setParams(auditFiltersToParams(DEFAULT_AUDIT_FILTERS))}
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>

      {filters.targetId ? (
        <p className={styles.muted}>
          Conta: {targetLabel}{" "}
          <Button size="sm" variant="outline" onClick={() => update({ targetId: "" })}>
            Remover filtro de conta
          </Button>
        </p>
      ) : null}

      {invalidRange ? (
        <Alert tone="warm">A data inicial é depois da data final. Ajuste o período.</Alert>
      ) : null}

      {invalidRange ? null : audit.isPending ? (
        <p role="status" aria-busy="true" className={styles.muted}>
          Carregando auditoria…
        </p>
      ) : audit.isError || !data ? (
        <Alert
          tone="danger"
          title="Não foi possível carregar a auditoria"
          action={
            <Button size="sm" variant="outline" onClick={() => audit.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {audit.error instanceof ApiError && audit.error.isNetworkError
            ? "Não foi possível falar com o servidor."
            : "Tente novamente em instantes."}
        </Alert>
      ) : data.events.length === 0 ? (
        data.total > 0 ? (
          <EmptyState
            title="Esta página não existe"
            icon="search"
            action={<Button onClick={() => update({ page: 1 })}>Voltar à primeira página</Button>}
          >
            Os resultados têm menos páginas do que a indicada no endereço.
          </EmptyState>
        ) : hasActiveAuditFilters(filters) ? (
          <EmptyState
            title="Nenhum evento encontrado"
            icon="search"
            action={
              <Button
                variant="outline"
                onClick={() => setParams(auditFiltersToParams(DEFAULT_AUDIT_FILTERS))}
              >
                Limpar filtros
              </Button>
            }
          >
            Nenhum evento corresponde ao período, à ação e à conta escolhidos.
          </EmptyState>
        ) : (
          <EmptyState title="Nenhum evento ainda" icon="history">
            As ações administrativas aparecem aqui assim que acontecerem.
          </EmptyState>
        )
      ) : (
        <>
          <p role="status" className={styles.muted}>
            {data.total === 1 ? "1 evento" : `${data.total} eventos`}
          </p>
          <AuditTable events={data.events} />
          <Pagination
            page={filters.page}
            totalPages={data.totalPages}
            onChange={(page) => update({ page })}
          />
        </>
      )}
    </div>
  );
}
