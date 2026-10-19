Histórico de versões da prescrição, da mais recente para a mais antiga.

**O consumidor fornece:** `versions` (`{number, summary, date, author?, status, current?}`), onde `status` é `draft`, `published` ou `archived` e `current` marca a versão vigente.

- Versão publicada é imutável: editar cria um novo rascunho a partir dela.
- Só uma versão pode ser `current`. Um rascunho aparece no topo, acima da vigente.
