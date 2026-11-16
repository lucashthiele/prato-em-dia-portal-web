import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import type { components, paths } from "../../../shared/api";
import { client } from "../../../shared/api";
import { fetchUser, userQueryKey } from "./users";

export type AuditEvent = components["schemas"]["AuditEventResponse"];
export type AuditQuery = NonNullable<
  paths["/api/v1/admin/audit-events"]["get"]["parameters"]["query"]
>;

export interface AuditPage {
  events: AuditEvent[];
  total: number;
  totalPages: number;
}

export function useAuditEvents(query: AuditQuery = {}) {
  return useQuery({
    queryKey: ["admin", "audit", query],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AuditPage> => {
      const { data } = await client.GET("/api/v1/admin/audit-events", { params: { query } });
      const events = data?.content ?? [];
      return {
        events,
        total: data?.totalElements ?? events.length,
        totalPages: data?.totalPages ?? 1,
      };
    },
  });
}

const NAME_STALE_MS = 5 * 60_000;

export type AccountName =
  { state: "loading" } | { state: "found"; name: string } | { state: "missing" };

/**
 * Contorno do S-09: o servidor ainda não devolve nomes na auditoria, então o portal busca cada
 * conta distinta da página em `GET /admin/users/{id}`. Compartilha o cache com a tela de detalhe.
 */
export function useAccountNames(ids: string[]): Map<string, AccountName> {
  const distinct = [...new Set(ids)];
  const results = useQueries({
    queries: distinct.map((id) => ({
      queryKey: userQueryKey(id),
      queryFn: () => fetchUser(id),
      staleTime: NAME_STALE_MS,
      retry: false,
    })),
  });
  const names = new Map<string, AccountName>();
  distinct.forEach((id, index) => {
    const result = results[index];
    const name = result.data?.fullName ?? result.data?.email;
    names.set(
      id,
      name
        ? { state: "found", name }
        : result.isPending
          ? { state: "loading" }
          : { state: "missing" },
    );
  });
  return names;
}
