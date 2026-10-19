Cabeçalho obrigatório de toda tela de paciente: nome, e-mail e situação do vínculo, para evitar erro de autoria.

**O consumidor fornece:** `name`, `email`, `linkStatus` (`active` | `ended`), opcionalmente `accessStatus` (`pending` | `sent` | `failed`), `description` (versão vigente, data, autor) e `actions` (botões).

- Sempre renderize com os dados do paciente atual; ao trocar de paciente, mostre esqueleto, nunca o nome anterior.
- No máximo uma ação `primary` em `actions`.
- As ações vêm do fluxo real do paciente: “Nova versão” (primária) e “Reenviar acesso” (outline, só quando `accessStatus` é `pending` ou `failed`). “Encerrar vínculo” fica num menu de mais ações, com `ConfirmDialog`. O portal não abre nem simula o app.
