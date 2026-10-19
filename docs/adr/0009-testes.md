# 0009 — Testes

**Status:** aceita · **Data:** 2026-10-19

## Contexto

Todo plano de implementação precisa de uma estratégia de testes. O portal é quase todo interface sobre uma API externa.

## Decisão

- **Vitest** como executor, com **React Testing Library** para componentes e fluxos. Consultas por papel e rótulo, o que também confere a acessibilidade.
- **MSW** (Mock Service Worker) simula o backend na camada de rede. Os handlers usam os tipos gerados do OpenAPI (ver [0003](0003-tipos-da-api-gerados.md)), então uma mudança de contrato quebra o teste na compilação.
- **Playwright (ponta a ponta) fica fora do setup inicial.** Entra num ticket próprio, com o primeiro fluxo real (cadastrar paciente, criar e publicar prescrição), quando houver um backend rodando no CI.
- A primeira tela deve ter testes para: login com sucesso, senha errada, `401` e sessão restaurada do `localStorage`.

## Consequências

- Testes rápidos e sem backend no ar.
- Os mocks podem divergir do comportamento real do servidor; o Playwright futuro cobre essa lacuna.

## Alternativas descartadas

- **Jest:** exige mais configuração com Vite e TypeScript.
- **Mocks de `fetch` à mão:** não exercitam o cliente nem os tipos.
- **Só testes ponta a ponta:** lentos e dependem de um backend no ar.
