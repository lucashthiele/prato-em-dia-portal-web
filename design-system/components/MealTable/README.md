Tabela de refeições da prescrição ou da semana: horário, refeição, kcal e, no acompanhamento, o status registrado.

**O consumidor fornece:** `rows` (`{time, meal, items?, kcal, status?, substituted?}`) e `caption` (descrição acessível). A coluna Status aparece só quando alguma linha tem `status`.

- Na aba Prescrição, omita `status`: a prescrição não tem execução.
- No Acompanhamento, use os estados Registrada, Parcial e Sem registro (`logged`, `partial`, `none`); linha sem registro recebe `none`. `substituted: true` acrescenta a marca “Com substituição” ao lado do estado.
- A tabela rola horizontalmente dentro do card em telas estreitas; nunca a página.
