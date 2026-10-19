# Design system — Portal Pro Nutri

Sistema visual do **Portal Pro Nutri**, a aplicação web em que o nutricionista cadastra pacientes, publica prescrições e acompanha a semana registrada no app Prato em Dia. Ele herda a identidade do aplicativo do paciente (verde profundo sobre superfícies claras e quentes) e a adapta para uso prioritário em desktop.

O portal tem um trabalho: levar o profissional até **uma prescrição publicada**. Indicadores e painéis nunca competem com esse fluxo.

## Princípios

- **O paciente é o contexto.** Toda tela de paciente começa com `PatientHeader`: nome, e-mail e situação do vínculo. Não existe navegação global de prescrições.
- **Publicar é uma ação explícita.** Rascunho, publicada e arquivada são estados visíveis, com número de versão, data e autoria. Publicar e encerrar vínculo sempre passam por `ConfirmDialog`.
- **O que o paciente vê fica claro.** O editor diferencia o que é rascunho do que já está vigente no app.
- **Prescrito ≠ planejado ≠ realizado.** Mostre os três separadamente. Ausência de registro é “Sem registro”, nunca descumprimento.
- **Sem métrica clínica inventada.** Não mostre percentual de “adesão” no MVP: não há denominador acordado. Use contagens (`WeekSummary`).
- **Erros com próximo passo.** Toda falha recuperável diz o que aconteceu e oferece a ação seguinte, perto de onde aconteceu.

## Conteúdo e voz

- Português do Brasil, tratamento por **você**, tom profissional e calmo. Sem linguagem de prontuário, sem diagnóstico.
- Sentence case em títulos e botões: “Nova versão”, “Publicar versão”, “Adicionar paciente”. Caixa alta só no estilo `overline` (cabeçalhos de tabela).
- Botões dizem a ação com verbo: “Publicar versão”, “Reenviar acesso”, “Encerrar vínculo”. Nunca “OK” ou “Salvar planejamento” genérico.
- Nunca exponha enums técnicos. Use os nomes de produto:

| Técnico | No portal |
|---|---|
| `RESTRICTED` | Seguir o plano |
| `SUBSTITUTIONS_ONLY` | Permitir substituições |
| `FREE` | Montagem livre |
| `PENDING` / `SENT` / `FAILED` | Envio pendente / Acesso enviado / Falha no envio |
| execução | Realizada / Não realizada / Alterada (realizada com substituição) / Sem registro |

- Sem emoji. Números no formato brasileiro: `2.000 kcal`, `140 g`, datas `12/04`, horas `07:00`.
- Mensagens de erro de login não revelam se o e-mail existe: “E-mail ou senha incorretos.”

## Cor

- Fundo da página em `canvas`; unidades delimitadas (card, tabela, campo, diálogo) em `surface` com borda `border-card` em `outline-variant`. A barra lateral fica em `surface-low`.
- `primary` é a única cor de ação: botão primário, item de navegação selecionado, links e anel de foco. Não use verde para decorar.
- Texto: `ink` para conteúdo, `ink-muted` para metadados e cabeçalhos de tabela. Os dois passam 4.5:1 em todas as superfícies, nos dois temas.
- `primary` como texto só sobre `canvas`, `surface` ou `surface-low` (fica abaixo de 4.5:1 sobre `surface-container` no tema claro). `secondary` como texto só sobre `canvas` ou `surface`; em chips use `on-secondary-container`.
- Estados usam contêineres tonais com texto `on-*`: sucesso/vigente em `primary-container`, alterada/rascunho em `secondary-container`, erro em `danger-container`, neutro em `surface-container`.
- **Estado nunca depende só de cor.** `StatusChip` sempre leva ícone e texto; verde e vermelho também diferem em ícone (check × X).
- Tema escuro é completo (mesmos nomes de token); o tema claro é o obrigatório do MVP.

## Tipografia

- Família `sans` = **Figtree** (Google Fonts, pesos 400–700), com fallback de sistema. O app mobile usa a fonte do sistema; no web o Figtree mantém a mesma geometria arredondada das referências.
- Escala vinda do `textTheme` do app: `display` (34) só em login/Início, `headline` (26) para o nome do paciente e títulos de página, `title` (18) para cards e diálogos, `subtitle` (16/600) para nomes de refeição, `body` (14) como texto padrão, `label` (14/600) em botões e navegação, `caption` (12) em dicas, `overline` (12/600, caixa alta) em cabeçalhos de tabela.
- Valores numéricos (`metric`, colunas kcal/g, horários) usam `font-variant-numeric: tabular-nums`.

## Espaço, raio e superfície

- Grade de 4px: `space-4` dentro de cards e campos, `space-5` entre cards, `space-6` entre seções, `space-8` de respiro do conteúdo principal.
- Raios do app: `radius-md` (18) em botões, campos e itens de navegação; `radius-lg` (26) em cards, tiles e diálogos; `radius-pill` em chips e abas.
- Tudo é plano: separe com bordas, não sombras. `shadow-overlay` existe só para diálogos e menus.
- Layout desktop: `SideNav` fixa de `sidebar-width` + coluna de conteúdo até `content-max`. Abaixo de 900px a navegação vira barra superior; tabelas rolam horizontalmente dentro do card, nunca a página.
- Alvos de clique com no mínimo `control-height` (44px).

## Estados e interação

- **Foco:** anel sólido `border-focus` em `primary`, com 2px de afastamento; ≥3:1 em todas as superfícies. Navegação completa por teclado.
- **Carregando:** esqueleto em `surface-container` quando a estrutura é conhecida. Ao trocar de paciente, limpe a tela antes de mostrar o próximo — nunca dados do paciente anterior.
- **Salvando:** `SaveStatus` ao lado da ação (“Salvando…”, “Rascunho salvo às 14:32”, “Não foi possível salvar”).
- **Vazio:** `EmptyState` explica por que não há dados e oferece no máximo uma ação.
- **Erro:** `Alert` tone `danger` no topo do bloco afetado, com ação de repetição. 409 pede “Recarregar” antes de repetir; 401/403 leva ao login ou explica a falta de acesso.
- **Movimento:** transições curtas (150ms, ease-out) só em hover, foco e abertura de diálogo.

## Iconografia

- Ícones de traço, 20px, traço 1.75, cantos arredondados, na cor do texto ao lado — o mesmo estilo de linha das referências. O bundle traz um `Icon` com o conjunto mínimo usado pelos componentes (`home`, `users`, `user`, `file`, `check`, `x`, `swap`, `clock`, `mail`, `alert`, `plus`, `search`, `history`, `logout`, `chevron`).
- Na implementação, use **Lucide** (`lucide-react`) para qualquer ícone além desses, com `strokeWidth={1.75}`. O app mobile usa Material Icons; o portal não mistura os dois.
- Ícone nunca aparece sozinho como única pista de estado; botões só de ícone precisam de `aria-label`.

## Marca

- Use o símbolo `assets/prato_em_dia_logo.png` (o mesmo do app) — folhas dentro de um círculo, em gradiente verde. Não redesenhe, não recolora e não aplique sobre fundos verdes; sobre `canvas`, `surface` ou `surface-low` ele funciona nos dois temas.
- Ao lado do símbolo: “Prato em Dia” em `subtitle`/700 e “Portal Pro Nutri” em `caption` `ink-muted`.

## Navegação

Áreas do MVP, na ordem: **Início**, **Pacientes**, **Perfil e conta**. A área **Administração** é separada e só aparece para `ADMIN`. Dentro de um paciente: abas **Prescrição** e **Acompanhamento**.

As imagens de referência anteriores mostram itens como Prescrições, Modelos e Receitas na lateral e um tile de “Aderência”; eles ficam fora do MVP por decisão de produto.
