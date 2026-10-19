Tabela de refeições da prescrição ou da semana: horário, refeição, kcal e, no acompanhamento, o status registrado.

**O consumidor fornece:** `rows` (`{time, meal, items?, kcal, status?}`) e `caption` (descrição acessível). A coluna Status aparece só quando alguma linha tem `status`.

- Na aba Prescrição, omita `status`: a prescrição não tem execução.
- No Acompanhamento, use os status de execução; linha sem evento recebe `none` (“Sem registro”).
- A tabela rola horizontalmente dentro do card em telas estreitas; nunca a página.
