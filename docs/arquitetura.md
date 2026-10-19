# Arquitetura do portal web

Visão geral das decisões técnicas do portal do nutricionista. Cada decisão tem um ADR com contexto, consequências e alternativas descartadas. O comportamento de produto está em `../docs/Portal do Nutricionista — Referência de Produto MVP.md`, fora deste repositório.

**Estado:** documentação das decisões. O código (setup e primeira tela) ainda não existe e será feito em outro ticket.

## Stack

| Área | Escolha | ADR |
|---|---|---|
| Aplicação | SPA em React 19.3 + TypeScript 6.0.x + Vite 8 + React Router 8, sem SSR | [0001](adr/0001-framework-e-versoes.md) |
| Estado do servidor | TanStack Query; sessão em contexto React; sem store global | [0002](adr/0002-estado-do-servidor-e-cliente-http.md) |
| Cliente HTTP | `fetch` fino e tipado (`openapi-fetch`) | [0002](adr/0002-estado-do-servidor-e-cliente-http.md) |
| Tipos da API | Gerados do OpenAPI (`yarn api:generate`) | [0003](adr/0003-tipos-da-api-gerados.md) |
| Estilos | CSS Modules + `src/styles/tokens.css`; `design-system/` só como referência | [0004](adr/0004-estilos-e-design-system-como-referencia.md) |
| Acessibilidade | Primitivos sem estilo do Radix UI | [0005](adr/0005-primitivos-acessiveis.md) |
| Estrutura | Pastas por feature, fronteiras verificadas por lint | [0006](adr/0006-estrutura-e-fronteiras.md) |
| Sessão | Tokens em `localStorage` (temporário, até LUC-54) | [0007](adr/0007-sessao-e-armazenamento-de-tokens.md) |
| URL da API | `/api/v1` relativo, proxy no Vite e no proxy reverso | [0008](adr/0008-url-da-api-e-cors.md) |
| Testes | Vitest + React Testing Library + MSW | [0009](adr/0009-testes.md) |
| Ferramentas e CI | Yarn 4, ESLint, Stylelint, Prettier, GitHub Actions | [0010](adr/0010-ferramentas-e-ci.md) |

## Estrutura de pastas

```
src/
  app/            roteador, providers (QueryClient, sessão), layout do shell
  features/
    auth/         login, contexto de sessão, armazenamento de tokens
    patients/     api/ components/ pages/ hooks/
    prescriptions/
    tracking/
    profile/
  shared/
    ui/           componentes do design system portados
    api/          cliente fetch, tipos gerados, tratamento de erros
    lib/          utilitários pequenos, mapeamento de enums para rótulos
  styles/         tokens.css, estilos globais
```

## Regras de dependência

Verificadas por `eslint-plugin-boundaries` no lint e no CI:

1. `shared` não importa de `features` nem de `app`.
2. Uma feature não importa o interior de outra; usa só o `index.ts` público dela.
3. Não há ciclos entre features.
4. `fetch` não é chamado fora de `shared/api`.

## Fluxo de uma requisição

1. A **página** (fina) compõe componentes da feature e chama um hook de query, por exemplo `usePatients()`.
2. O **hook** (`features/patients/api/`) usa o TanStack Query. A chave inclui o id do paciente quando há um.
3. A **função da feature** escolhe rota, parâmetros e corpo e chama o cliente tipado de `shared/api`, por exemplo `client.GET("/nutritionists/me/patients", ...)`.
4. O **cliente** (`shared/api`) anexa o `Authorization`, renova o token em `401` e converte erros Problem Details em `ApiError`.
5. O pedido sai para `/api/v1/...` na **mesma origem**. No desenvolvimento o Vite faz o proxy; em produção o proxy reverso encaminha ao Spring Boot.
6. A feature **mapeia a resposta** para o que a interface precisa (por exemplo, enums para rótulos) e a página renderiza os componentes de `shared/ui`.

## Contrato com o backend

Os tipos vêm de `/v3/api-docs` e são versionados. Antes de planejar uma funcionalidade que dependa do contrato, rode `yarn api:generate`. Detalhes em [0003](adr/0003-tipos-da-api-gerados.md) e em `AGENTS.md`.

## Pendências conhecidas

- **LUC-54:** mover a sessão para cookies `HttpOnly` (backend e portal). Bloqueia o release em produção.
- **Backend:** o endpoint `POST /api/v1/identity/useraccounts` não deve ser usado pelo portal sem autorização administrativa no servidor (ver a referência de produto, seção 2.1).
- **Design system:** mudanças em `design-system/` geram um ticket de acompanhamento no front-end. Não há sincronização automática.
- **Setup e primeira tela:** Login, `/me`, Início dentro do shell com `SideNav`, em outro ticket.
