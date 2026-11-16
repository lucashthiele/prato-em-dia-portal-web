import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/server";
import { AuditPage } from ".";
import { auditActionLabel } from "./lib/labels";
import { auditFiltersToQuery, parseAuditFilters } from "./lib/filters";
import { renderRoutes, user } from "./test-utils";

const ADMIN = "00000000-0000-4000-8000-0000000000aa";
const ANA = "00000000-0000-4000-8000-000000000001";
const BIA = "00000000-0000-4000-8000-000000000002";

const events = [
  {
    id: "e1",
    occurredAt: "2026-11-10T14:32:00Z",
    actorAccountId: ADMIN,
    action: "NUTRITIONIST_CREATED",
    targetAccountId: ANA,
    details: "Registro CRN-3 1",
  },
  {
    id: "e2",
    occurredAt: "2026-11-11T09:00:00Z",
    actorAccountId: ADMIN,
    action: "USER_STATUS_CHANGED",
    targetAccountId: ANA,
    details: "INACTIVE",
  },
  {
    id: "e3",
    occurredAt: "2026-11-12T09:00:00Z",
    actorAccountId: ADMIN,
    action: "USER_STATUS_CHANGED",
    targetAccountId: BIA,
    details: "ACTIVE",
  },
  {
    id: "e4",
    occurredAt: "2026-11-13T09:00:00Z",
    actorAccountId: ADMIN,
    action: "RELATIONSHIPS_ENDED",
    targetAccountId: "00000000-0000-4000-8000-0000000000ff",
  },
  {
    id: "e5",
    occurredAt: "2026-11-14T09:00:00Z",
    actorAccountId: ADMIN,
    action: "ACCESS_EMAIL_RESENT",
    targetAccountId: BIA,
  },
];

function mockAudit(content = events) {
  const queries: URLSearchParams[] = [];
  const lookups: string[] = [];
  server.use(
    http.get("*/api/v1/admin/audit-events", ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({
        content,
        page: 0,
        size: 20,
        totalElements: content.length,
        totalPages: 1,
      });
    }),
    http.get("*/api/v1/admin/users/:id", ({ params }) => {
      const id = String(params.id);
      lookups.push(id);
      if (id === ADMIN)
        return HttpResponse.json(user(9, { id, fullName: "Admin Geral", role: "ADMIN" }));
      if (id === ANA) return HttpResponse.json(user(1, { id, fullName: "Ana Souza" }));
      if (id === BIA) return HttpResponse.json(user(2, { id, fullName: "Bia Lima" }));
      return HttpResponse.json({ status: 404, code: "NOT_FOUND" }, { status: 404 });
    }),
  );
  return { queries, lookups };
}

const routes = [
  { path: "/admin/auditoria", element: <AuditPage /> },
  { path: "/admin/usuarios/:id", element: <p>Detalhe</p> },
];
const last = <T,>(items: T[]) => items[items.length - 1];

describe("rótulos e filtros da auditoria", () => {
  it("traduz as ações pela tabela da Q35", () => {
    expect(auditActionLabel("NUTRITIONIST_CREATED")).toBe("Nutricionista cadastrado");
    expect(auditActionLabel("ACCESS_EMAIL_RESENT")).toBe("E-mail de acesso reenviado");
    expect(auditActionLabel("USER_STATUS_CHANGED", "ACTIVE")).toBe("Conta ativada");
    expect(auditActionLabel("USER_STATUS_CHANGED", "INACTIVE")).toBe("Conta desativada");
    expect(auditActionLabel("USER_STATUS_CHANGED", "ACTIVE -> INACTIVE")).toBe("Conta desativada");
    expect(auditActionLabel("RELATIONSHIPS_ENDED")).toBe("Vínculos encerrados");
  });

  it("converte a URL em parâmetros da API e ignora lixo", () => {
    const query = auditFiltersToQuery(
      parseAuditFilters(
        new URLSearchParams(`de=2026-11-01&ate=2026-11-30&acao=reenvio&alvo=${ANA}&pagina=2`),
      ),
    );
    expect(query).toMatchObject({
      page: 1,
      size: 20,
      action: "ACCESS_EMAIL_RESENT",
      targetId: ANA,
    });
    expect(new Date(query.from!).getTime()).toBe(new Date("2026-11-01T00:00:00").getTime());
    expect(new Date(query.to!).getTime()).toBe(new Date("2026-11-30T23:59:59.999").getTime());
    expect(parseAuditFilters(new URLSearchParams("de=ontem&alvo=abc&acao=X"))).toMatchObject({
      from: "",
      targetId: "",
      action: undefined,
    });
  });
});

describe("página de auditoria", () => {
  it("mostra as colunas, ações em português e nomes resolvidos", async () => {
    const { lookups } = mockAudit();
    renderRoutes(routes, "/admin/auditoria");

    await screen.findByRole("table");
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Nutricionista cadastrado")).toBeInTheDocument();
    for (const header of ["Data e hora", "Autor", "Ação", "Conta afetada", "Detalhe"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(table.getByText("Conta ativada")).toBeInTheDocument();
    expect(table.getByText("Conta desativada")).toBeInTheDocument();
    expect(table.getByText("E-mail de acesso reenviado")).toBeInTheDocument();
    expect(table.getByText("Vínculos encerrados")).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    await waitFor(() => expect(within(rows[1]).getByText("Admin Geral")).toBeInTheDocument());
    expect(within(rows[1]).getByRole("link", { name: "Ana Souza" })).toHaveAttribute(
      "href",
      `/admin/usuarios/${ANA}`,
    );
    expect(within(rows[3]).getByText("Bia Lima")).toBeInTheDocument();
    // Alvo que o servidor não encontra.
    expect(await within(rows[4]).findByText("Conta não encontrada")).toBeInTheDocument();
    // Nunca o enum no detalhe.
    expect(within(rows[2]).getByText("Desativada")).toBeInTheDocument();
    expect(screen.queryByText(/INACTIVE|RELATIONSHIPS_ENDED/)).not.toBeInTheDocument();
    // Ids distintos, uma consulta cada (cache do TanStack Query).
    expect(lookups.slice().sort()).toEqual(
      [ADMIN, ANA, BIA, "00000000-0000-4000-8000-0000000000ff"].sort(),
    );
  });

  it("filtra por ação e por período", async () => {
    const { queries } = mockAudit();
    renderRoutes(routes, "/admin/auditoria");
    await screen.findByRole("table");

    await userEvent.selectOptions(screen.getByLabelText("Ação"), "E-mail de acesso reenviado");
    await waitFor(() => expect(last(queries).get("action")).toBe("ACCESS_EMAIL_RESENT"));

    await userEvent.type(screen.getByLabelText("De"), "2026-11-01");
    await waitFor(() => expect(last(queries).has("from")).toBe(true));
    await userEvent.type(screen.getByLabelText("Até"), "2026-11-30");
    await waitFor(() => expect(last(queries).has("to")).toBe(true));
    expect(screen.getByTestId("where")).toHaveTextContent(
      "de=2026-11-01&ate=2026-11-30&acao=reenvio",
    );

    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await waitFor(() => expect(last(queries).has("action")).toBe(false));
    expect(last(queries).has("from")).toBe(false);
  });

  it("filtra por conta vinda de 'Ver na auditoria' e mostra o nome dela", async () => {
    const { queries } = mockAudit(events.slice(0, 2));
    renderRoutes(routes, `/admin/auditoria?alvo=${ANA}`);

    expect(await screen.findByText("Conta: Ana Souza")).toBeInTheDocument();
    await waitFor(() => expect(last(queries).get("targetId")).toBe(ANA));

    await userEvent.click(screen.getByRole("button", { name: "Remover filtro de conta" }));
    await waitFor(() => expect(last(queries).has("targetId")).toBe(false));
  });

  it("mostra vazio com filtro e vazio sem filtro", async () => {
    mockAudit([]);
    renderRoutes(routes, "/admin/auditoria?acao=reenvio");
    expect(await screen.findByText("Nenhum evento encontrado")).toBeInTheDocument();
  });

  it("mostra vazio sem filtro", async () => {
    mockAudit([]);
    renderRoutes(routes, "/admin/auditoria");
    expect(await screen.findByText("Nenhum evento ainda")).toBeInTheDocument();
  });

  it("mostra erro com nova tentativa", async () => {
    server.use(
      http.get("*/api/v1/admin/audit-events", () =>
        HttpResponse.json({ status: 500, code: "INTERNAL" }, { status: 500 }),
      ),
    );
    renderRoutes(routes, "/admin/auditoria");
    expect(await screen.findByText("Não foi possível carregar a auditoria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
