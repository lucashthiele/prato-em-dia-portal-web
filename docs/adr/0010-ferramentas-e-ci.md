# 0010 — Ferramentas e CI

**Status:** aceita · **Data:** 2026-10-19

## Contexto

As regras acordadas (fronteiras entre pastas, proibição de valores soltos no CSS, acessibilidade) precisam de ferramentas que as verifiquem.

## Decisão

- **Gerenciador de pacotes:** Yarn 4, fixado em `packageManager` no `package.json` e ativado com o Corepack. `nodeLinker: node-modules`, para o Vite e as demais ferramentas funcionarem sem Plug'n'Play. `yarn.lock` versionado.
- **Node 24**, em `.nvmrc` e em `engines`.
- **ESLint** (flat config) com `typescript-eslint`, `eslint-plugin-boundaries` (fronteiras e proibição de `fetch` fora de `shared/api`) e `jsx-a11y`. O plugin de fronteiras precisa do `eslint-import-resolver-typescript` para resolver imports `.ts`.
- **Stylelint** proíbe cor, espaçamento, raio e fonte soltos no CSS dos componentes.
- **Prettier** para formatação.
- **Pre-commit** com husky e lint-staged, só nos arquivos em stage.
- **GitHub Actions** em cada PR: lint (ESLint, Stylelint, Prettier), verificação de tipos, testes e build.

## Consequências

- O mesmo conjunto de verificações roda localmente e no CI.
- O Biome seria mais rápido, mas não executa as regras de fronteira (`eslint-plugin-boundaries`).
- A `typescript-eslint` limita a versão do TypeScript (ver [0001](0001-framework-e-versoes.md)).
- O `yarn` global desta máquina é a versão 1.22 (Classic); o Corepack passa a usar a 4 dentro do projeto.

## Alternativas descartadas

- **npm:** funcionaria, mas foi preferido o Yarn.
- **Yarn Classic 1.22:** em manutenção, sem novos recursos.
- **pnpm:** mais rápido e estrito, mas é mais uma ferramenta para um projeto pequeno.
- **Biome:** não cobre as regras de fronteira.
