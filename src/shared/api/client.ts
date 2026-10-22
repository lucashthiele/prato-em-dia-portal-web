import createClient, { type Middleware } from "openapi-fetch";
import { ApiError, NETWORK_ERROR_CODE, toApiError } from "./errors";
import type { paths } from "./schema";

// Os caminhos do OpenAPI já trazem /api/v1. Sem override, a base é a origem da página (ADR 0008);
// ela é explícita porque o fetch do Node (testes) não resolve URLs relativas.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** Como o cliente lê e atualiza a sessão. Quem guarda a sessão (features/auth) registra isto. */
export interface SessionAccessors {
  getTokens: () => SessionTokens | null;
  onRefreshed: (tokens: SessionTokens) => void;
  /** A renovação falhou: a sessão não vale mais. */
  onExpired: () => void;
}

let accessors: SessionAccessors | null = null;

export function configureSession(next: SessionAccessors | null): void {
  accessors = next;
}

// O fetch global é resolvido a cada chamada (e não na criação), para o MSW interceptar nos testes.
const rawFetch = (request: Request) => globalThis.fetch(request);

// Rotas de autenticação não levam token nem disparam renovação.
const isAuthRoute = (url: string) =>
  /\/api\/v1\/auth\/(login|refresh|logout)$/.test(new URL(url).pathname);

// Uma renovação por vez: pedidos que falham juntos com 401 esperam a mesma resposta.
let refreshing: Promise<SessionTokens | null> | null = null;

async function refreshTokens(failedAccessToken: string): Promise<SessionTokens | null> {
  const current = accessors?.getTokens();
  // Outro pedido já renovou enquanto este esperava: basta repetir com o token novo.
  if (current && current.accessToken !== failedAccessToken) return current;
  if (!current) return null;

  refreshing ??= (async () => {
    try {
      const { data } = await createClient<paths>({ baseUrl, fetch: rawFetch }).POST(
        "/api/v1/auth/refresh",
        { body: { refreshToken: current.refreshToken } },
      );
      if (!data?.accessToken || !data.refreshToken) return null;
      const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      accessors?.onRefreshed(tokens);
      return tokens;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// Cópia do pedido para repetir após a renovação (o corpo de um Request só é lido uma vez).
const retryable = new WeakMap<Request, Request>();

const apiMiddleware: Middleware = {
  onRequest({ request }) {
    if (isAuthRoute(request.url)) return request;
    const tokens = accessors?.getTokens();
    if (!tokens) return request;
    const authorized = new Request(request, {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        Authorization: `Bearer ${tokens.accessToken}`,
      }),
    });
    retryable.set(authorized, authorized.clone());
    return authorized;
  },
  async onResponse({ request, response }) {
    const original = retryable.get(request);
    if (response.status === 401 && original) {
      const failedToken = request.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
      const tokens = await refreshTokens(failedToken);
      if (!tokens) {
        accessors?.onExpired();
        throw await toApiError(response);
      }
      const headers = new Headers(original.headers);
      headers.set("Authorization", `Bearer ${tokens.accessToken}`);
      const retried = await rawFetch(new Request(original, { headers }));
      if (!retried.ok) {
        if (retried.status === 401) accessors?.onExpired();
        throw await toApiError(retried);
      }
      return retried;
    }
    if (!response.ok) throw await toApiError(response);
  },
  onError({ error }) {
    // O openapi-fetch também passa por aqui o ApiError lançado em onResponse.
    if (error instanceof ApiError) return error;
    return new ApiError(0, NETWORK_ERROR_CODE, error instanceof Error ? error.message : "");
  },
};

export const client = createClient<paths>({ baseUrl, fetch: rawFetch });
client.use(apiMiddleware);
