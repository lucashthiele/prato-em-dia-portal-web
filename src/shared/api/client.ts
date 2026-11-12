import createClient, { type Middleware } from "openapi-fetch";
import { ApiError, NETWORK_ERROR_CODE, toApiError } from "./errors";
import type { paths } from "./schema";

// Os caminhos do OpenAPI já trazem /api/v1. Sem override, a base é a origem da página (ADR 0008);
// ela é explícita porque o fetch do Node (testes) não resolve URLs relativas.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

// A sessão vive em cookies HttpOnly (ADR 0011): o JavaScript nunca vê os tokens.
const credentials = "include";
const clientVersion = `web/${__APP_VERSION__}`;

/** O que o cliente avisa a quem guarda o estado da sessão (features/auth registra isto). */
export interface SessionAccessors {
  /** A renovação falhou: a sessão não vale mais. */
  onExpired: () => void;
  /** O backend exige o aceite dos termos vigentes antes de qualquer outra rota. */
  onConsentRequired: () => void;
}

let accessors: SessionAccessors | null = null;

export function configureSession(next: SessionAccessors | null): void {
  accessors = next;
}

// O fetch global é resolvido a cada chamada (e não na criação), para o MSW interceptar nos testes.
const rawFetch = (request: Request) => globalThis.fetch(request);

// Rotas de autenticação não disparam renovação.
const isAuthRoute = (url: string) =>
  /\/api\/v1\/auth\/(login|refresh|logout)$/.test(new URL(url).pathname);

// Uma renovação por vez: pedidos que falham juntos com 401 esperam a mesma resposta.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const response = await rawFetch(
        new Request(new URL("/api/v1/auth/refresh", baseUrl), {
          method: "POST",
          credentials,
          headers: { "X-Client-Version": clientVersion },
        }),
      );
      return response.ok;
    } catch {
      return false;
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
    request.headers.set("X-Client-Version", clientVersion);
    if (!isAuthRoute(request.url)) retryable.set(request, request.clone());
    return request;
  },
  async onResponse({ request, response }) {
    if (response.ok) return;
    const original = retryable.get(request);
    if (response.status === 401 && original) {
      // O refresh token é de uso único: se outra aba renovou primeiro, a nossa renovação falha,
      // mas os cookies já são novos. Por isso o pedido é repetido uma vez de qualquer forma.
      await refreshSession();
      const retried = await rawFetch(original);
      if (retried.ok) return retried;
      const error = await toApiError(retried);
      if (retried.status === 401) accessors?.onExpired();
      else if (error.code === "CONSENT_REQUIRED") accessors?.onConsentRequired();
      throw error;
    }
    const error = await toApiError(response);
    if (error.code === "CONSENT_REQUIRED") accessors?.onConsentRequired();
    throw error;
  },
  onError({ error }) {
    // O openapi-fetch também passa por aqui o ApiError lançado em onResponse.
    if (error instanceof ApiError) return error;
    return new ApiError(0, NETWORK_ERROR_CODE, error instanceof Error ? error.message : "");
  },
};

export const client = createClient<paths>({ baseUrl, fetch: rawFetch, credentials });
client.use(apiMiddleware);
