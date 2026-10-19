Mensagem em linha sobre o bloco afetado: erro recuperável, aviso, informação ou confirmação.

**O consumidor fornece:** `tone` (`info` | `success` | `warm` | `danger`), `title`, `children` (explicação) e opcionalmente `action` (um `Button` `sm`).

- Todo erro diz o que falhou e qual é o próximo passo (“Tentar novamente”, “Recarregar”).
- Conflito 409: “Esta prescrição mudou em outra aba. Recarregue antes de publicar.”
- Não use snackbar como única explicação de falha.
