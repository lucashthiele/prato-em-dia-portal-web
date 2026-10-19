# 0005 — Primitivos acessíveis

**Status:** aceita · **Data:** 2026-10-19

## Contexto

`ConfirmDialog`, `Tabs` e `SideNav` precisam de foco preso em diálogos, navegação por teclado e ARIA correta. A referência de produto exige navegação por teclado.

## Decisão

- O comportamento vem de primitivos **sem estilo** do **Radix UI** (por exemplo Dialog e Tabs), importados um a um.
- Toda a aparência é nossa: CSS Modules e tokens (ver [0004](0004-estilos-e-design-system-como-referencia.md)).
- O lint inclui `eslint-plugin-jsx-a11y`.

## Consequências

- Foco, `Esc`, setas e ARIA ficam com uma biblioteca testada, não reimplementados à mão.
- Dependência extra por primitivo.
- Antes de instalar, confirmar que os pacotes do Radix escolhidos suportam React 19.

## Alternativas descartadas

- **React Aria Components:** boa acessibilidade, mas traz mais estrutura própria para adaptar ao design system.
- **Escrever à mão:** é a parte mais fácil de errar.
- **Bibliotecas com estilo (MUI, Chakra):** conflitam com os tokens e com a regra de visual plano.
