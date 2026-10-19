# 0001 — Framework e versões

**Status:** aceita · **Data:** 2026-10-19

## Contexto

O portal é uma ferramenta autenticada, usada principalmente em desktop por nutricionistas. Não tem necessidade de SEO: a landing page é outro produto. A API é um backend separado (Spring Boot). O design system de referência é escrito em React.

## Decisão

Aplicação de página única (SPA), sem renderização no servidor:

- React 19.3 e React DOM 19.3
- TypeScript 6.0.x
- Vite 8
- React Router 8

Versões conferidas no registro npm em 2026-10-19. Ao instalar, use a última versão estável de cada linha acima.

## Consequências

- Sem SSR (Next.js, Remix): menos infraestrutura, deploy como arquivos estáticos atrás do proxy reverso.
- O design system de referência usa React 18 via `window.React`. Isso não importa: os componentes são portados, e o que se preserva são nomes, props, estados e valores (ver [0004](0004-estilos-e-design-system-como-referencia.md)).
- TypeScript fica abaixo da 7.0: a `typescript-eslint` 8.72 só suporta TypeScript `<6.1.0`. Subir para a 7 quando o lint suportar.
- Node 24 em desenvolvimento e CI. Vite 8 exige Node `^20.19 || >=22.12` e React Router 8 exige Node `>=22.22`.
- React Router 8 e Vite 8 são versões novas; confira as notas de migração ao instalar.

## Alternativas descartadas

- **Next.js / Remix:** SSR e roteamento no servidor sem ganho para uma ferramenta autenticada.
- **React 18:** só combinaria com o bundle de referência, que não é usado em produção.
- **TypeScript 7:** ainda sem suporte da `typescript-eslint`.
