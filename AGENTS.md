# Portal Pro Nutri — instruções para agentes

Portal web do nutricionista do Prato em Dia: cadastrar pacientes, publicar prescrições e acompanhar a semana registrada no app. Comportamento de produto: `../docs/Portal do Nutricionista — Referência de Produto MVP.md`.

## Arquitetura

Stack, estrutura de pastas e regras de dependência estão em `docs/arquitetura.md`; cada decisão tem um ADR em `docs/adr/`. Leia antes de planejar qualquer mudança de código e não contrarie um ADR sem propor outro.

## Design system (aprovado)

Toda interface do portal segue `design-system/`. Antes de criar ou alterar qualquer tela ou componente:

1. Leia `design-system/README.md` inteiro: princípios, voz, uso de cor, tipografia, estados, iconografia e navegação.
2. `design-system/` é só referência de design: leia-o, mas o código do app **nunca importa** dele. No código, use os tokens do app em `src/styles/tokens.css` (variáveis CSS; tema escuro em `[data-theme="dark"]`), que seguem `design-system/tokens.json` (fonte da verdade do design). Nunca escreva cor, espaçamento, raio ou fonte soltos no código. Se `design-system/` mudar, atualize o front-end num ticket de acompanhamento.
3. Antes de usar um componente, leia `design-system/components/<Comp>/README.md` (quando usar e o que o consumidor fornece) e as props em `design-system/components/index.d.ts`.

`components/bundle.js` + `bundle.css` são a implementação de referência (React 18 via `window.React`, global `window.PratoPortal`). Ao implementar o portal de verdade, porte os componentes para a stack do projeto mantendo nomes, props, estados e valores; não invente variações. `components/<Comp>/preview.html` traz exemplos de uso com dados realistas; são fragmentos (não carregam tokens nem bundle sozinhos), leia como referência de props.

### Regras que mais se perdem

- Paciente é o contexto: toda tela de paciente começa com `PatientHeader` (nome, e-mail, vínculo). Não há navegação global de prescrições; a SideNav tem só Início, Pacientes, Perfil e conta.
- Estado sempre com ícone + texto (`StatusChip`), nunca só cor. Execução: Realizada / Alterada / Não realizada / Sem registro. “Sem registro” nunca é descumprimento.
- Sem percentual de adesão no MVP: mostre contagens (`WeekSummary`).
- Nunca exponha enums: `RESTRICTED`/`SUBSTITUTIONS_ONLY`/`FREE` → “Seguir o plano” / “Permitir substituições” / “Montagem livre”.
- Publicar versão, arquivar e encerrar vínculo sempre passam por `ConfirmDialog`. O portal não abre nem simula o app do paciente.
- Português do Brasil, “você”, sentence case, botões com verbo, sem emoji.
- Tudo plano (bordas, não sombras); `shadow-overlay` só em diálogos e menus.
- Logo: `design-system/assets/prato_em_dia_logo.png`, o mesmo do app mobile. Não redesenhe nem recolora.

## Referências visuais

- `prototipos/telas.html`: telas de exemplo aprovadas (Login, Pacientes, Prescrição, Acompanhamento) montadas só com o design system. Para abrir: servidor `prototipos` em `.claude/launch.json` (porta 4380). É um retrato estático, não código de produção.
- A versão publicada do design system: https://claude.ai/artifact/2JojWRjBQ5xRyVvp2kRLKr. Ao mudar o sistema, mude `design-system/` primeiro e mantenha os dois iguais.

## Planejamento obrigatório antes de implementar

Antes de modificar qualquer arquivo ou escrever código para resolver uma issue, você deve obrigatoriamente criar um plano de arquitetura e validá-lo com o usuário. Não prossiga com a implementação sem a aprovação explícita do plano.

O plano deve descrever:

- **Arquivos afetados:** quais arquivos serão criados, alterados ou removidos (incluindo testes).
- **Lógica a implementar:** o que muda em cada arquivo e por quê, incluindo decisões de design, telas/estados de UI afetados e alternativas descartadas.
- **Riscos e pontos em aberto:** impacto em fluxos existentes, compatibilidade com a API e dúvidas que dependem do usuário.
- **Estratégia de testes:** como a mudança será verificada (testes de unidade/componente e validação manual no portal).

Fluxo:

1. Leia a issue e explore o código (somente leitura) para embasar o plano.
2. Apresente o plano ao usuário e aguarde validação.
3. Se o usuário pedir ajustes, atualize o plano e valide novamente.
4. Só então implemente, seguindo o plano aprovado. Se surgir algo que o invalide, pare e alinhe antes de continuar.

## Correção de ADRs

Se durante o trabalho um ADR em `docs/adr/` (ou `docs/arquitetura.md`) se mostrar incorreto, desatualizado ou incompatível com a realidade (por exemplo, formato de erro do backend ou versão de biblioteca), você pode propor a correção, mas **nunca a aplique sem aprovação explícita do usuário**. Descreva o que muda e por quê, aguarde a aprovação e só então edite. Enquanto isso, siga o ADR vigente ou registre o desvio no plano e no PR.

## Contrato com o backend

Os tipos da API são gerados a partir do OpenAPI do backend (`/v3/api-docs`) e ficam versionados no repositório. Ao desenvolver qualquer funcionalidade que dependa do contrato com o backend (rotas, payloads, erros, enums), rode `yarn api:generate` **antes** de desenhar a solução e de montar o plano. Assim o plano parte do contrato atual, não de suposição. Se o diff dos tipos gerados mostrar mudança de contrato, trate-a no plano como risco ou ponto em aberto.

Nunca escreva à mão tipos de request ou response que o OpenAPI já cobre. Se o backend ainda não expõe o que a funcionalidade precisa, registre a lacuna no plano em vez de contornar no portal.
