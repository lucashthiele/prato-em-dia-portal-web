Campo de texto com rótulo persistente, dica e erro no próprio campo.

**O consumidor fornece:** `label` (sempre visível — nunca só placeholder), `value`/`onChange` ou `defaultValue`, opcionalmente `hint`, `error`, `icon` (ex.: `search`), `multiline` para observações, e qualquer atributo nativo (`type`, `autoComplete`, `required`).

- Mostre o erro de validação abaixo do campo afetado, com ícone, e mantenha o valor digitado.
- No login, o erro de credencial vai num `Alert` acima do formulário, sem indicar se o e-mail existe.
- Busca de pacientes: `icon="search"` e placeholder “Buscar por nome ou e-mail”.
