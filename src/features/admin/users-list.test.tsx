import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/server";
import { UsersListPage } from ".";
import { parseUserFilters, userFiltersToQuery, userFiltersToParams } from "./lib/filters";
import { renderRoutes, user, type AdminUser } from "./test-utils";

interface Page {
  content: AdminUser[];
  totalElements?: number;
  totalPages?: number;
}

function mockUsers(respond: (query: URLSearchParams) => Page) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get("*/api/v1/admin/users", ({ request }) => {
      const query = new URL(request.url).searchParams;
      queries.push(query);
      const page = respond(query);
      return HttpResponse.json({
        page: 0,
        size: 20,
        totalElements: page.content.length,
        totalPages: 1,
        ...page,
      });
    }),
  );
  return queries;
}

const routes = [
  { path: "/admin/usuarios", element: <UsersListPage /> },
  { path: "/admin/usuarios/*", element: <p>Outra tela</p> },
];
const last = <T,>(items: T[]) => items[items.length - 1];

describe("filtros da URL de usuários", () => {
  it("fala português na URL e converte para a API", () => {
    const filters = parseUserFilters(
      new URLSearchParams("papel=paciente&situacao=desativada&busca= ana &pagina=3"),
    );
    expect(userFiltersToQuery(filters)).toEqual({
      page: 2,
      size: 20,
      q: "ana",
      role: "PATIENT",
      status: "INACTIVE",
    });
    expect(userFiltersToParams(filters).toString()).toBe(
      "busca=ana&papel=paciente&situacao=desativada&pagina=3",
    );
  });

  it("ignora valores desconhecidos", () => {
    expect(parseUserFilters(new URLSearchParams("papel=ADMIN&pagina=-1"))).toEqual({
      q: "",
      role: undefined,
      status: undefined,
      page: 1,
    });
  });
});

describe("lista de usuários", () => {
  it("mostra papel, situação e acesso em português, sem enums", async () => {
    mockUsers(() => ({
      content: [
        user(1, { accessEmail: { status: "SENT" } }),
        user(2, { role: "PATIENT", status: "INACTIVE" }),
        user(3, { role: "ADMIN" }),
      ],
    }));
    renderRoutes(routes, "/admin/usuarios");

    expect(await screen.findByRole("link", { name: "Usuário 1" })).toHaveAttribute(
      "href",
      "/admin/usuarios/00000000-0000-4000-8000-000000000001",
    );
    expect(screen.getByText("3 usuários")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Nutricionista")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Ativa")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Acesso enviado")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Paciente")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Desativada")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Administrador")).toBeInTheDocument();
    expect(screen.queryByText(/ACTIVE|NUTRITIONIST|PATIENT/)).not.toBeInTheDocument();
  });

  it("busca por nome ou e-mail e volta à primeira página", async () => {
    const queries = mockUsers(() => ({ content: [user(1)] }));
    renderRoutes(routes, "/admin/usuarios?pagina=2");
    await screen.findByRole("link", { name: "Usuário 1" });

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar usuário" }), "ana");

    await waitFor(() => expect(last(queries).get("q")).toBe("ana"));
    expect(last(queries).get("page")).toBe("0");
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/usuarios?busca=ana");
  });

  it("filtra por papel e por situação", async () => {
    const queries = mockUsers(() => ({ content: [user(1)] }));
    renderRoutes(routes, "/admin/usuarios");
    await screen.findByRole("link", { name: "Usuário 1" });

    await userEvent.click(screen.getByRole("button", { name: "Pacientes" }));
    await waitFor(() => expect(last(queries).get("role")).toBe("PATIENT"));
    await userEvent.click(screen.getByRole("button", { name: "Desativadas" }));
    await waitFor(() => expect(last(queries).get("status")).toBe("INACTIVE"));
    expect(screen.getByRole("button", { name: "Pacientes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("where")).toHaveTextContent("papel=paciente&situacao=desativada");

    await userEvent.click(screen.getByRole("button", { name: "Todos" }));
    await waitFor(() => expect(last(queries).has("role")).toBe(false));
  });

  it("pagina com Anterior e Próxima", async () => {
    const queries = mockUsers((query) => ({
      content: [user(query.get("page") === "1" ? 2 : 1)],
      totalElements: 25,
      totalPages: 2,
    }));
    renderRoutes(routes, "/admin/usuarios");
    await screen.findByText("Página 1 de 2");
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));

    expect(await screen.findByRole("link", { name: "Usuário 2" })).toBeInTheDocument();
    expect(last(queries).get("page")).toBe("1");
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("mostra vazio com filtro e limpa os filtros", async () => {
    mockUsers((query) => ({ content: query.has("q") ? [] : [user(1)] }));
    renderRoutes(routes, "/admin/usuarios?busca=zzz");

    expect(await screen.findByText("Nenhum usuário encontrado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(await screen.findByRole("link", { name: "Usuário 1" })).toBeInTheDocument();
  });

  it("mostra vazio sem filtro", async () => {
    mockUsers(() => ({ content: [] }));
    renderRoutes(routes, "/admin/usuarios");
    expect(await screen.findByText("Nenhum usuário ainda")).toBeInTheDocument();
  });

  it("mostra erro com nova tentativa", async () => {
    let fail = true;
    server.use(
      http.get("*/api/v1/admin/users", () =>
        fail
          ? HttpResponse.json({ status: 500, code: "INTERNAL" }, { status: 500 })
          : HttpResponse.json({ content: [user(1)], totalElements: 1, totalPages: 1 }),
      ),
    );
    renderRoutes(routes, "/admin/usuarios");

    expect(await screen.findByText("Não foi possível carregar os usuários")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("link", { name: "Usuário 1" })).toBeInTheDocument();
  });

  it("leva ao cadastro de nutricionista", async () => {
    mockUsers(() => ({ content: [user(1)] }));
    renderRoutes(
      [...routes, { path: "/admin/usuarios/novo", element: <p>Cadastro</p> }],
      "/admin/usuarios",
    );
    await userEvent.click(await screen.findByRole("button", { name: "Cadastrar nutricionista" }));
    expect(await screen.findByText("Cadastro")).toBeInTheDocument();
  });
});
