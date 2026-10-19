# 0004 — Estilos e design system como referência

**Status:** aceita · **Data:** 2026-10-19

## Contexto

A pasta `design-system/` traz README, tokens (`tokens.json`, `tokens.css`), uma implementação de referência (`components/bundle.js`, `bundle.css`) e prévias. O portal deve seguir esse design sem soltar cor, espaçamento, raio ou fonte no código.

## Decisão

- **`design-system/` é só referência de design.** O app **nunca importa** nada dessa pasta. Ela serve para decisões de design e para ler comportamento, props e estados dos componentes.
- O app tem seus próprios tokens em `src/styles/tokens.css` (variáveis CSS, tema escuro em `[data-theme="dark"]`), escritos à mão a partir de `design-system/tokens.json`.
- Os componentes são portados para `shared/ui` em TypeScript, mantendo nomes, props, estados e valores, com **CSS Modules** (um arquivo por componente) usando só `var(--token)`.
- **Sem Tailwind, sem biblioteca de componentes visuais, sem CSS-in-JS em runtime.** O Stylelint proíbe cor, espaçamento, raio e fonte soltos no CSS dos componentes.
- **Divergência é aceita.** Quando `design-system/` mudar, um ticket de acompanhamento atualiza o front-end. Não há script de geração nem verificação automática entre as pastas.

## Consequências

- O app é autocontido e não depende de uma pasta de referência.
- Risco de divergência entre o design e o código; o custo é um ticket por mudança de design.
- Como o design system já é CSS com variáveis, o port dos estilos é, na maior parte, dividir o `bundle.css` por componente.

## Alternativas descartadas

- **Tailwind v4 mapeado aos tokens:** a marcação se enche de classes utilitárias e a escala padrão deixa passar valores fora dos tokens.
- **Vanilla Extract / Panda CSS:** exigem um pipeline que gere o tema em TypeScript para cerca de 15 componentes.
- **CSS-in-JS em runtime (styled-components, Emotion):** custo em runtime e nenhum ganho aqui.
- **Importar `design-system/tokens.css` direto, ou gerar a cópia a partir de `tokens.json`:** acoplaria o app à pasta de referência.
