# 0007 — Sessão e armazenamento de tokens

**Status:** aceita, **temporária** · **Data:** 2026-10-19

## Contexto

O backend devolve o access token (JWT, curta duração) e o refresh token (opaco, rotacionado) no corpo JSON de `/auth/login` e `/auth/refresh`. Não há cookies, e a proteção CSRF está desligada no backend (sessão sem estado, bearer token). Mudar isso exige alterar o backend.

## Decisão

Por enquanto, o portal guarda **os dois tokens em `localStorage`**:

- o cliente HTTP anexa o access token e, em `401`, tenta renovar uma vez com o refresh token;
- se a renovação falhar, a sessão é encerrada e o usuário volta ao login com um aviso discreto, mantendo a URL de destino;
- a leitura e a escrita dos tokens ficam isoladas em `features/auth`, para trocar o mecanismo sem mexer nas outras features.

## Consequências

- `localStorage` é legível por JavaScript: um XSS pode roubar os dois tokens. A sessão também persiste entre abas e reinícios do navegador.
- **Esta decisão não vai para produção.** A issue LUC-54 move a sessão para cookies `HttpOnly` (backend e portal) e deve ser concluída antes do release de produção.
- Aceitável apenas em desenvolvimento e em piloto interno controlado.

## Alternativas consideradas

- **Access token em memória e refresh token em `sessionStorage`:** reduz a exposição, mas foi preterido por simplicidade nesta fase.
- **Os dois em memória:** nada persiste, mas todo recarregamento exige novo login.
- **Cookies `HttpOnly`:** escolha final, via LUC-54. Cookie `HttpOnly` não é legível por JavaScript; o portal apenas o envia (`credentials: "include"`), e o backend precisará de proteção CSRF e CORS com credenciais, ou do mesmo domínio (ver [0008](0008-url-da-api-e-cors.md)).
