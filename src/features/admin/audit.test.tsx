import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/server";
import { AuditPage } from ".";
import { auditActionLabel, auditDetailText } from "./lib/labels";
import { auditFiltersToQuery, parseAuditFilters } from "./lib/filters";
import { renderRoutes } from "./test-utils";
import type { AuditEvent } from "./api/audit";

const ADMIN = "00000000-0000-4000-8000-0000000000aa";
const ANA = "00000000-0000-4000-8000-000000000001";
const BIA = "00000000-0000-4000-8000-000000000002";

const events: AuditEvent[] = [
  {
    id: "e1",
    occurredAt: "2026-11-10T14:32:00Z",
    actorAccountId: ADMIN,
    actorName: "Admin Geral",
    action: "NUTRITIONIST_CREATED",
    targetAccountId: ANA,
    targetName: "Ana Souza",
    targetEmail: "ana@exemplo.com",
    details: "Registro CRN-3 1",
  },
  {
    id: "e2",
    occurredAt: "2026-11-11T09:00:00Z",
    actorAccountId: ADMIN,
    actorName: "Admin Geral",
    action: "USER_STATUS_CHANGED",
    targetAccountId: ANA,
    targetName: "Ana Souza",
    details: "INACTIVE",
  },
  {
    id: "e3",
    occurredAt: "2026-11-12T09:00:00Z",
    actorAccountId: ADMIN,
    actorName: "Admin Geral",
    action: "USER_STATUS_CHANGED",
    targetAccountId: BIA,
    targetName: "Bia Lima",
    details: "ACTIVE",
  },
  {
    id: "e4",
    occurredAt: "2026-11-13T09:00:00Z",
    actorAccountId: ADMIN,
    actorName: "Admin Geral",
    action: "RELATIONSHIPS_ENDED",
    targetAccountId: "00000000-0000-4000-8000-0000000000ff",
    details: "count=3",
  },
  {
    id: "e5",
    occurredAt: "2026-11-14T09:00:00Z",
    actorAccountId: ADMIN,
    action: "ACCESS_EMAIL_RESENT",
    targetAccountId: BIA,
    targetEmail: "bia@exemplo.com",
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
  );
  // Nenhuma consulta de nome: tudo vem do próprio evento (S-09).
  server.use(
    http.get("*/api/v1/admin/users/:id", ({ params }) => {
      lookups.push(String(params.id));
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

  it("traduz o detalhe cru do servidor", () => {
    expect(auditDetailText("ACTIVE -> INACTIVE", "USER_STATUS_CHANGED")).toBe("Ativa → Desativada");
    expect(auditDetailText("email=ana@exemplo.com", "NUTRITIONIST_CREATED")).toBe(
      "E-mail: ana@exemplo.com",
    );
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
  it("mostra as colunas, ações em português e os nomes que vêm no evento", async () => {
    const { lookups } = mockAudit();
    renderRoutes(routes, "/admin/auditoria");

    await screen.findByRole("table");
    const table = within(screen.getByRole("table"));
    for (const header of ["Data e hora", "Autor", "Ação", "Conta afetada", "Detalhe"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(table.getByText("Nutricionista cadastrado")).toBeInTheDocument();
    expect(table.getByText("Conta ativada")).toBeInTheDocument();
    expect(table.getByText("Conta desativada")).toBeInTheDocument();
    expect(table.getByText("E-mail de acesso reenviado")).toBeInTheDocument();
    expect(table.getByText("Vínculos encerrados")).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Admin Geral")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("link", { name: "Ana Souza" })).toHaveAttribute(
      "href",
      `/admin/usuarios/${ANA}`,
    );
    expect(within(rows[3]).getByText("Bia Lima")).toBeInTheDocument();
    // Nunca o enum no detalhe.
    expect(within(rows[2]).getByText("Desativada")).toBeInTheDocument();
    expect(screen.queryByText(/INACTIVE|RELATIONSHIPS_ENDED|count=/)).not.toBeInTheDocument();
    // Sem contorno: nenhuma consulta de usuário para resolver nomes.
    expect(lookups).toEqual([]);
  });

  it("usa texto neutro quando nome e e-mail vêm nulos", async () => {
    mockAudit();
    renderRoutes(routes, "/admin/auditoria");
    await screen.findByRole("table");
    const rows = screen.getAllByRole("row");
    // Alvo sem nome nem e-mail: id curto, ainda com link para o detalhe.
    expect(within(rows[4]).getByRole("link", { name: "Conta 00000000" })).toHaveAttribute(
      "href",
      "/admin/usuarios/00000000-0000-4000-8000-0000000000ff",
    );
    // Autor sem nome: id curto. Alvo sem nome: e-mail.
    expect(within(rows[5]).getByRole("link", { name: "Conta 00000000" })).toBeInTheDocument();
    expect(within(rows[5]).getByRole("link", { name: "bia@exemplo.com" })).toBeInTheDocument();
  });

  it("mostra N vínculos encerrados no detalhe, com singular para 1", async () => {
    mockAudit([
      { ...events[3], details: "count=3" },
      { ...events[3], id: "e6", details: "count=1" },
      { ...events[3], id: "e7", details: "count=0" },
    ]);
    renderRoutes(routes, "/admin/auditoria");
    await screen.findByRole("table");
    expect(screen.getByText("3 vínculos encerrados")).toBeInTheDocument();
    expect(screen.getByText("1 vínculo encerrado")).toBeInTheDocument();
    expect(screen.getByText("0 vínculos encerrados")).toBeInTheDocument();
  });

  it("filtra por Vínculos encerrados", async () => {
    const { queries } = mockAudit();
    renderRoutes(routes, "/admin/auditoria");
    await screen.findByRole("table");
    await userEvent.selectOptions(screen.getByLabelText("Ação"), "Vínculos encerrados");
    await waitFor(() => expect(last(queries).get("action")).toBe("RELATIONSHIPS_ENDED"));
    expect(screen.getByTestId("where")).toHaveTextContent("acao=vinculos");
  });

  it("trata AUDIT_INVALID_FILTER como período inválido", async () => {
    server.use(
      http.get("*/api/v1/admin/audit-events", () =>
        HttpResponse.json(
          { status: 400, code: "AUDIT_INVALID_FILTER", message: "x" },
          { status: 400 },
        ),
      ),
    );
    renderRoutes(routes, "/admin/auditoria?de=2026-11-01&ate=2026-11-30");
    expect(
      await screen.findByText("A data inicial é depois da data final. Ajuste o período."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Não foi possível carregar a auditoria")).not.toBeInTheDocument();
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
