Resumo de uma semana registrada no app: refeições planejadas e o último evento de cada uma, em contagens.

**O consumidor fornece:** `title` (ex.: “Semana 8 · 07/04 a 13/04”), `subtitle` (prescrição de origem), `counts` (`{planned, done, substituted, skipped, none}`) vindos do resumo da API — sem cálculo paralelo no portal.

- Mostre contagens, não percentual. “Sem registro” fica separado de “Não realizada”.
- Semana sem planejamento: use `EmptyState` em vez de um resumo zerado.
- Os títulos dos cards são os mesmos rótulos do `StatusChip`: “Realizada”, “Alterada”, “Não realizada”, “Sem registro”. O tooltip de “Alterada” explica: “Realizada com substituição”.
