import { useNavigate, useSearchParams } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, EmptyState } from "../../../shared/ui";
import { useUsers } from "../api/users";
import { Pagination } from "../components/Pagination";
import { UsersFilters } from "../components/UsersFilters";
import { UsersTable } from "../components/UsersTable";
import {
  DEFAULT_USER_FILTERS,
  hasActiveUserFilters,
  parseUserFilters,
  userFiltersToParams,
  userFiltersToQuery,
  type UserFilters,
} from "../lib/filters";
import styles from "./Page.module.css";

export function UsersListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = parseUserFilters(params);
  const users = useUsers(userFiltersToQuery(filters));

  // Qualquer mudança de filtro ou busca volta para a primeira página.
  function update(patch: Partial<UserFilters>) {
    setParams(userFiltersToParams({ ...filters, page: 1, ...patch }), { replace: "q" in patch });
  }

  const data = users.data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Usuários</h1>
        <Button icon="plus" onClick={() => navigate("/admin/usuarios/novo")}>
          Cadastrar nutricionista
        </Button>
      </header>

      <UsersFilters filters={filters} onChange={update} />

      {users.isPending ? (
        <p role="status" aria-busy="true" className={styles.muted}>
          Carregando usuários…
        </p>
      ) : users.isError || !data ? (
        <Alert
          tone="danger"
          title="Não foi possível carregar os usuários"
          action={
            <Button size="sm" variant="outline" onClick={() => users.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {users.error instanceof ApiError && users.error.status === 0
            ? "Não foi possível falar com o servidor."
            : "Tente novamente em instantes."}
        </Alert>
      ) : data.users.length === 0 ? (
        data.total > 0 ? (
          <EmptyState
            title="Esta página não existe"
            icon="search"
            action={<Button onClick={() => update({ page: 1 })}>Voltar à primeira página</Button>}
          >
            Os resultados têm menos páginas do que a indicada no endereço.
          </EmptyState>
        ) : hasActiveUserFilters(filters) ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            icon="search"
            action={
              <Button
                variant="outline"
                onClick={() => setParams(userFiltersToParams(DEFAULT_USER_FILTERS))}
              >
                Limpar filtros
              </Button>
            }
          >
            Nenhum usuário corresponde à busca e aos filtros escolhidos.
          </EmptyState>
        ) : (
          <EmptyState title="Nenhum usuário ainda" icon="users">
            As contas aparecem aqui assim que forem criadas.
          </EmptyState>
        )
      ) : (
        <>
          <p role="status" className={styles.muted}>
            {data.total === 1 ? "1 usuário" : `${data.total} usuários`}
          </p>
          <UsersTable users={data.users} />
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
