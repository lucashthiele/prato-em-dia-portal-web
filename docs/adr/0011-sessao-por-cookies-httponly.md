# 0011 — Sessão por cookies HttpOnly

**Status:** aceita · **Data:** 2026-11-12 · **Substitui:** [0007](0007-sessao-e-armazenamento-de-tokens.md)

## Contexto

O backend passou a emitir o access token e o refresh token em cookies `HttpOnly`, `SameSite=Strict`, para web e mobile, e removeu os tokens do corpo de `/auth/login` e `/auth/refresh` (ADR 0001 do backend). O header `Authorization: Bearer` deixou de ser aceito. O portal guardava os tokens em `localStorage` (ADR 0007), exposto a XSS.

## Decisão

O JavaScript do portal **nunca vê os tokens**. A sessão são os cookies, enviados pelo navegador.

- O cliente HTTP envia `credentials: "include"` e o header `X-Client-Version: web/<versão do package.json>` em toda requisição. Não envia `Authorization`.
- **Estado da sessão** (`features/auth`): `loading`, `authenticated`, `consent` ou `anonymous`. Ao abrir o portal, `GET /me` decide: `200` autenticado, `403 CONSENT_REQUIRED` termos pendentes, qualquer outro erro anônimo. Nada de autenticação fica em `localStorage`.
- **Renovação:** em `401`, uma única renovação por vez (`POST /auth/refresh`, que lê o cookie) e o pedido é repetido uma vez. O refresh token é de uso único: se outra aba renovou primeiro, a nossa renovação falha, mas os cookies já são novos; por isso o pedido é repetido mesmo se a renovação falhar. Só se o pedido repetido ainda der `401` a sessão termina e o cache é limpo.
- **Termos:** `403 CONSENT_REQUIRED` leva a `/termos`, onde o usuário aceita a versão vigente de cada documento (`GET` e `POST /me/consents`). A API informa só tipo e versão; o texto fica no portal (`features/auth/lib/legal-texts.ts`) e precisa de revisão jurídica.
- **Logout:** `POST /auth/logout` (revoga o refresh token e limpa os cookies) e a sessão local termina mesmo se a chamada falhar.
- **Destino:** o login volta ao endereço que o usuário pediu (só caminhos do próprio portal).
- **CSRF:** o backend confere o `Origin` das escritas contra uma lista de origens permitidas. O portal roda em `localhost:5173` em desenvolvimento (`strictPort`), que está na lista.
- **Desenvolvimento:** cookies `Secure` não são reenviados por HTTP em alguns navegadores (Safari); use `SESSION_COOKIE_SECURE=false` no `local.env` do backend.

## Consequências

- Um XSS não consegue mais ler os tokens (ainda pode fazer requisições na sessão, o que o `SameSite=Strict` e a checagem de `Origin` limitam).
- O portal depende de ficar na mesma origem da API (ADR 0008), com cookies de primeira parte.
- Abrir o portal faz uma chamada a `/me` antes de mostrar a área logada (estado `loading`).
- Troca de senha obrigatória no primeiro acesso (`passwordChangeRequired`) ainda não é tratada: LUC-74.

## Alternativas consideradas

- **Manter os tokens em `localStorage`:** incompatível com o backend, que não os devolve mais.
- **Bearer como reserva:** o backend não aceita; seria um segundo caminho de autenticação.
