Indicador discreto de salvamento ao lado da ação do editor.

**O consumidor fornece:** `state` (`saving` | `saved` | `error`) e opcionalmente `label` (ex.: “Rascunho salvo às 14:32”).

- Em `error`, acompanhe com um `Alert` explicando a falha e a nova tentativa.
