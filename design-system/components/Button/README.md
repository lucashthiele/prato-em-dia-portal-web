Botão de ação do portal; o verbo diz exatamente o que acontece ao clicar.

**Variantes:** `primary` (uma por área de tela: “Publicar versão”, “Nova versão”), `tonal` (ação secundária de destaque), `outline` (ações neutras, “Reenviar acesso”), `ghost` (cancelar, ações de baixo peso), `danger` (somente dentro de `ConfirmDialog` para encerrar vínculo ou arquivar).

**O consumidor fornece:** `children` (rótulo), `onClick`, opcionalmente `icon` (nome do `Icon`), `size` (`md` 44px | `sm` 36px), `loading`, `disabled`.

- Use `loading` durante o envio; o botão fica desabilitado e anuncia `aria-busy`.
- Não use dois `primary` lado a lado. Não use `danger` fora de uma confirmação.
- Rótulos em sentence case, sem “OK”.
