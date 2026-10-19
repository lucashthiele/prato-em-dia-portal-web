Navegação lateral fixa do portal, com a marca do Prato em Dia e a conta do profissional.

**O consumidor fornece:** `logoSrc` (o asset `prato_em_dia_logo.png`), `items` (`{id, label, icon, href?}`), `value` (área atual), `onChange`, `user` (`{name, registry?}`) e `onLogout`.

- Itens do MVP: Início (`home`), Pacientes (`users`), Perfil e conta (`user`). Administração só aparece para `ADMIN`, em área separada.
- Não adicione “Prescrições” como item global — a prescrição vive dentro do paciente.
- Abaixo de 900px vira uma barra superior; a conta passa para o menu de perfil.
