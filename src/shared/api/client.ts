import createClient, { type Middleware } from "openapi-fetch";
import { ApiError, NETWORK_ERROR_CODE, toApiError } from "./errors";
import type { paths } from "./schema";

// Os caminhos do OpenAPI já trazem /api/v1. Sem override, a base é a origem da página (ADR 0008);
// ela é explícita porque o fetch do Node (testes) não resolve URLs relativas.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) throw await toApiError(response);
  },
  onError({ error }) {
    // O openapi-fetch também passa por aqui o ApiError lançado em onResponse.
    if (error instanceof ApiError) return error;
    return new ApiError(0, NETWORK_ERROR_CODE, error instanceof Error ? error.message : "");
  },
};

// O fetch global é resolvido a cada chamada (e não na criação), para o MSW interceptar nos testes.
export const client = createClient<paths>({
  baseUrl,
  fetch: (request) => globalThis.fetch(request),
});
client.use(errorMiddleware);
