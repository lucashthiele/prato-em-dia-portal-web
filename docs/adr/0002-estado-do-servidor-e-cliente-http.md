# 0002 — Estado do servidor e cliente HTTP

**Status:** aceita · **Data:** 2026-10-19

## Contexto

Quase todo o estado do portal vem do servidor: pacientes, versões de prescrição, semanas. A referência de produto pede que o portal não mostre dados do paciente anterior enquanto carrega outro, indique salvamento e trate `401`, `403` e `409`.

## Decisão

- **TanStack Query** para estado do servidor (cache, carregamento, erro, invalidação).
- **Cliente `fetch` fino e tipado** em `shared/api` (ver [0003](0003-tipos-da-api-gerados.md)), com `openapi-fetch`.
- **Contexto React** para a sessão. Sem store global (Redux, Zustand); o estado local de UI fica nos componentes.
- As chaves de query incluem o id do paciente, o que impede que dados de um paciente apareçam na página de outro.

### Divisão de responsabilidades

`shared/api` cuida do transporte:

- instância do cliente e URL base;
- cabeçalho `Authorization` a partir da sessão;
- renovação do token em `401` e uma nova tentativa;
- conversão do corpo de erro do backend, `{status, code, message, errors[{field, code, message}]}` (não é Problem Details; o OpenAPI não documenta essas respostas), em um `ApiError` tipado (status, código, erros por campo); falha sem resposta vira `ApiError` com status `0`;
- os tipos gerados.

Cada feature monta as suas requisições: em `features/<feature>/api/` ficam as funções que escolhem rota, parâmetros e corpo, o mapeamento da resposta para o que a interface precisa e os hooks do TanStack Query. Features não chamam `fetch` nem tratam cabeçalhos e status HTTP diretamente; a regra é verificada por lint (ver [0006](0006-estrutura-e-fronteiras.md)).

## Consequências

- Erros `400`, `403`, `409` têm a mesma forma para todas as features.
- Sem store global, o estado compartilhado entre telas passa pelo cache de queries ou pelo contexto de sessão.

## Alternativas descartadas

- **Redux / Zustand para dados do servidor:** reimplementaria cache e invalidação à mão.
- **SWR:** cobre menos (mutações, invalidação) do que se precisa no editor de prescrição.
- **`fetch` espalhado nas features:** cada tela trataria erro e renovação de token à sua maneira.
