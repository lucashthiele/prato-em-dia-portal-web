Indicador discreto de salvamento ao lado da ação do editor.

**O consumidor fornece:** `state` (`unsaved` | `saving` | `saved` | `error`) e opcionalmente `label` (ex.: “Salvo às 14:32”).

- `unsaved` (“Alterações não salvas”, ícone de relógio) vale enquanto houver edições locais ainda não enviadas; o editor só salva pelo botão “Salvar rascunho”.
- Em `error`, acompanhe com um `Alert` explicando a falha e a nova tentativa.
