Resumo de uma semana registrada no app, em contagens de categorias de refeição (café da manhã, almoço, lanche e jantar de cada dia).

**O consumidor fornece:** `title` (ex.: “Semana de 07/04 a 13/04”), `subtitle` opcional e `counts` (`{planned, logged, partial, none, substituted}`).

- Cards, nesta ordem: **Previstas**, **Registradas**, **Parciais**, **Sem registro** e **Com substituição**. Os rótulos seguem o `StatusChip`.
- **Dias futuros não entram** nas contagens. **Sem registro** conta só categorias previstas; “—” (sem refeição planejada) nunca é contado.
- Mostre contagens, não percentual: não há denominador acordado no MVP.
- Semana sem planejamento: use `EmptyState` em vez de um resumo zerado.
