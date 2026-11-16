Rótulo de estado com ícone e texto — o portal nunca comunica estado só por cor.

**O consumidor fornece:** `status` — registro (`logged`, `partial`, `none`) e a marca `substituted`; prescrição (`draft`, `published`, `archived`), vínculo (`active`, `ended`) ou entrega de acesso (`pending`, `sent`, `failed`). `label` substitui o texto padrão quando necessário.

| `status` | API | Texto | Ícone | Tom |
|---|---|---|---|---|
| `logged` | `LOGGED` | Registrada | `check` | sucesso |
| `partial` | `PARTIAL` | Parcial | `clock` | quente |
| `none` | `NOT_LOGGED` | Sem registro | `minus` | neutro |
| `substituted` | item com substituição autorizada | Com substituição | `swap` | quente |

- “Sem registro” é neutro: ausência de registro não é descumprimento. “Não realizada” não existe no MVP.
- `substituted` é uma **marca extra**, mostrada ao lado do estado (`logged` ou `partial`), nunca no lugar dele. O tooltip diz “O paciente registrou uma substituição autorizada”. Nunca use “Alterada” nem “Substituída”.
- Uma categoria sem refeição planejada não leva chip: mostre “—”, que é diferente de “Sem registro”.
- Não crie cores novas de chip; os quatro tons (sucesso, quente, erro, neutro) cobrem todos os estados.
