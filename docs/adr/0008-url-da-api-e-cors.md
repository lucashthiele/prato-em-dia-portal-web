# 0008 — URL da API e CORS

**Status:** aceita · **Data:** 2026-10-19

## Contexto

O backend não tem nenhuma configuração de CORS: a cadeia de segurança não chama `.cors(...)` e não há `CorsConfigurationSource`. Um navegador em outra origem falharia já na requisição de preflight, inclusive no login. Conferido em `SecurityConfiguration.java` em 2026-10-19.

## Decisão

O portal chama a API por **caminho relativo**, `/api/v1/...`, em todos os ambientes, sempre na mesma origem da página:

- **Desenvolvimento:** o servidor do Vite faz proxy de `/api` para o backend (por exemplo `localhost:8080`). O navegador só fala com o Vite, então CORS não entra em jogo.
- **Produção:** o proxy reverso (Caddy ou Nginx, como no plano do backend) serve os arquivos estáticos do portal e encaminha `/api` ao contêiner do Spring, no mesmo domínio.
- `VITE_API_BASE_URL` é um override opcional. Usá-lo exige configurar CORS no backend.

## Consequências

- Nenhuma mudança no backend para CORS.
- Facilita a migração para cookies (LUC-54): cookies de primeira parte, sem `SameSite=None` nem CORS com credenciais.
- Se o portal for hospedado em outro domínio que o da API (por exemplo, hospedagem estática separada), será preciso uma regra de rewrite/proxy nessa hospedagem ou CORS no backend.

## Alternativas descartadas

- **URL absoluta da API + CORS no backend:** exige mudar o backend e deixaria as credenciais mais expostas.
