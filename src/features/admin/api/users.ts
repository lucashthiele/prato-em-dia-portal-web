import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { client, type components, type paths } from "../../../shared/api";

export type AdminUser = components["schemas"]["AdminUserResponse"];
export type UsersQuery = NonNullable<paths["/api/v1/admin/users"]["get"]["parameters"]["query"]>;
export type NewNutritionist = components["schemas"]["CreateNutritionistRequest"];
export type AccountStatus = "ACTIVE" | "INACTIVE";

export interface UsersPage {
  users: AdminUser[];
  /** Total que atende ao filtro aplicado. */
  total: number;
  totalPages: number;
}

export async function fetchUser(id: string): Promise<AdminUser | null> {
  const { data } = await client.GET("/api/v1/admin/users/{id}", { params: { path: { id } } });
  return data ?? null;
}

export function userQueryKey(id: string) {
  return ["admin", "users", "detail", id] as const;
}

export function useUsers(query: UsersQuery = {}) {
  return useQuery({
    queryKey: ["admin", "users", "list", query],
    // Mantém a página anterior na tela enquanto a nova carrega (busca, filtros, paginação).
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<UsersPage> => {
      const { data } = await client.GET("/api/v1/admin/users", { params: { query } });
      const users = data?.content ?? [];
      return {
        users,
        total: data?.totalElements ?? users.length,
        totalPages: data?.totalPages ?? 1,
      };
    },
  });
}

const POLL_MS = 3_000;
const POLL_WINDOW_MS = 30_000;

/** Enquanto o e-mail de acesso está pendente, consulta de novo por cerca de 30 s. */
export function useUser(id: string) {
  const startedAt = useRef<number | null>(null);
  return useQuery({
    queryKey: userQueryKey(id),
    queryFn: () => fetchUser(id),
    refetchInterval: (query) => {
      if (query.state.data?.accessEmail?.status !== "PENDING") return false;
      startedAt.current ??= Date.now();
      return Date.now() - startedAt.current < POLL_WINDOW_MS ? POLL_MS : false;
    },
  });
}

export function useCreateNutritionist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: NewNutritionist) => {
      const { data } = await client.POST("/api/v1/admin/nutritionists", { body });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useResendAccessEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await client.POST("/api/v1/admin/nutritionists/{id}/access-email", {
        params: { path: { id } },
      });
    },
    onSuccess: (_data, id) => queryClient.invalidateQueries({ queryKey: userQueryKey(id) }),
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AccountStatus }) => {
      await client.PATCH("/api/v1/admin/users/{id}/status", {
        params: { path: { id } },
        body: { status, endRelationships: false },
      });
    },
    // A lista, o detalhe e a auditoria (nova linha) mudam.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
}
