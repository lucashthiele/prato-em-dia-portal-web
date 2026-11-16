Confirmação explícita para ações que mudam o que o paciente vê ou encerram acesso.

**O consumidor fornece:** `title`, `children` (consequência em linguagem simples), `confirmLabel` (verbo), `onConfirm`, `onCancel`, opcionalmente `tone="danger"`, `loading`, `open`, `secondaryLabel` + `onSecondary` e `confirmHint`.

- Obrigatório para: publicar versão, arquivar versão, encerrar vínculo, ativar e desativar conta.
- O corpo explica a consequência: “Encerrar o vínculo interrompe seu acesso aos dados de Ana Ribeiro.”
- Foco inicial no botão de cancelar em ações `danger`.

## Variante com ação secundária (três botões)

Use quando a ação tem uma versão mais leve e uma mais ampla. Ordem fixa: **Cancelar**, ação secundária (`outline`, a opção conservadora) e ação de confirmar (a mais ampla; `tone="danger"` quando destrói ou encerra algo).

- `secondaryLabel` e `onSecondary` ativam o terceiro botão; os dois andam juntos.
- `confirmHint` é o apoio da ação de confirmar: diz o que ela faz a mais que a secundária. Fica entre o corpo e os botões, em `caption`, e é ligado ao botão por `aria-describedby`.
- Exemplo (desativar nutricionista): título “Desativar Ana Souza?”, corpo “Ana não poderá mais entrar no portal.”, botões [Cancelar] [Somente desativar] [Desativar e encerrar vínculos], com `confirmHint` explicando o encerramento dos vínculos.
- Os botões ocupam a linha; em largura estreita eles quebram para a linha seguinte, sem rolagem.
