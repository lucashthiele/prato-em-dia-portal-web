# 0006 — Estrutura de pastas e fronteiras

**Status:** aceita · **Data:** 2026-10-19

## Contexto

O backend é organizado por feature e tem regras de camada verificadas por testes (ArchUnit). O portal segue a mesma ideia, para que as dependências não virem uma teia.

## Decisão

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

Regras de dependência, verificadas por `eslint-plugin-boundaries` no lint e no CI:

1. `shared` não importa de `features` nem de `app`.
2. Uma feature não importa o interior de outra; usa só o `index.ts` público dela.
3. Não há ciclos entre features.
4. `fetch` não é chamado fora de `shared/api` (ver [0002](0002-estado-do-servidor-e-cliente-http.md)).

Páginas são finas: compõem componentes da feature e chamam os hooks de query da feature.

## Consequências

- Violações de fronteira quebram o build, em vez de depender de revisão.
- Uma funcionalidade nova entra como pasta nova em `features/`, sem mexer nas demais.

## Alternativas descartadas

- **Pastas por tipo (`components/`, `hooks/`, `pages/`):** mistura funcionalidades e não deixa dependências explícitas.
- **Convenção sem verificação automática:** costuma se perder com o tempo.
