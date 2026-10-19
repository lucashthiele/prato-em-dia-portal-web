# Portal Pro Nutri — instruções para agentes

Portal web do nutricionista do Prato em Dia: cadastrar pacientes, publicar prescrições e acompanhar a semana registrada no app. Comportamento de produto: `../docs/Portal do Nutricionista — Referência de Produto MVP.md`.

## Design system (aprovado)

Toda interface do portal segue `design-system/`. Antes de criar ou alterar qualquer tela ou componente:

1. Leia `design-system/README.md` inteiro: princípios, voz, uso de cor, tipografia, estados, iconografia e navegação.
2. Use os tokens de `design-system/tokens.json` (fonte da verdade) ou `design-system/tokens.css` (as mesmas variáveis CSS; tema escuro em `[data-theme="dark"]`). Nunca escreva cor, espaçamento, raio ou fonte soltos no código.
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
