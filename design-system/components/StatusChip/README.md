Rótulo de estado com ícone e texto — o portal nunca comunica estado só por cor.

**O consumidor fornece:** `status` — execução (`done`, `skipped`, `substituted`, `none`), prescrição (`draft`, `published`, `archived`), vínculo (`active`, `ended`) ou entrega de acesso (`pending`, `sent`, `failed`). `label` substitui o texto padrão quando necessário (ex.: “Alterada pelo paciente”).

- “Sem registro” é neutro: ausência de registro não é descumprimento.
- Refeição consumida com substituição é “Alterada” em todo o portal (chip, tabela e resumo da semana); o tooltip mostra “Realizada com substituição”. Nunca use “Substituída”, que não diz se a refeição foi consumida.
- Não crie cores novas de chip; os quatro tons (sucesso, quente, erro, neutro) cobrem todos os estados.
