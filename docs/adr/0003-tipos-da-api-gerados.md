# 0003 — Tipos da API gerados do OpenAPI

**Status:** aceita · **Data:** 2026-10-19

## Contexto

O backend publica o contrato em `/v3/api-docs`. Essa rota é pública na configuração atual (`permitAll`), então pode ser lida sem token. Tipos escritos à mão se afastariam do backend sem aviso.

## Decisão

- Os tipos de request e response são gerados com `openapi-typescript` a partir de `/v3/api-docs` e **versionados** no repositório.
- O comando é `yarn api:generate`.
- O ADR/commit que atualiza os tipos registra a versão ou o commit do backend usado.
- Enums técnicos (`RESTRICTED`, `SUBSTITUTIONS_ONLY`, `FREE`, estados de execução) ficam na camada de dados e são convertidos para os rótulos do produto em **um único lugar** (`shared/lib`). Nunca aparecem na interface.
- Ao desenvolver qualquer funcionalidade que dependa do contrato, rode `yarn api:generate` antes de planejar (regra em `AGENTS.md`).
- Os handlers do MSW nos testes usam os mesmos tipos (ver [0009](0009-testes.md)): uma mudança de contrato quebra o teste na compilação.

## Consequências

- O diff dos tipos gerados mostra mudanças de contrato no PR.
- Gerar exige o backend rodando (ou um spec salvo), e o spec precisa estar correto. Lacunas no OpenAPI viram problema do backend, registrado no plano.

## Alternativas descartadas

- **Tipos escritos à mão:** divergem do backend.
- **Gerar em tempo de build sem versionar:** o build passaria a depender de um backend no ar, e mudanças de contrato ficariam invisíveis no PR.
