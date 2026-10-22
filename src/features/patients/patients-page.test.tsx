import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { components } from "../../shared/api";
import { server } from "../../test/server";
import { PatientsListPage } from ".";
import { parseFilters, toApiQuery, toSearchParams } from "./lib/filters";

type Patient = components["schemas"]["RelationshipOutput"];

function patient(n: number, delivery = "SENT"): Patient {
  return {
    relationshipId: `r${n}`,
    patientId: `p${n}`,
    patientFullName: `Paciente ${n}`,
    patientEmail: `p${n}@exemplo.com`,
    relationshipStatus: "ACTIVE",
    emailDeliveryStatus: delivery,
    createdAt: `2026-10-0${n}T10:00:00Z`,
  };
}

interface Page {
  content: Patient[];
  totalElements?: number;
  totalPages?: number;
}

/** Registra as consultas recebidas e responde com a página dada. */
function mockApi(respond: (query: URLSearchParams) => Page) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get("*/api/v1/me", () => HttpResponse.json({ fullName: "Marina" })),
    http.get("*/api/v1/nutritionists/me/patients", ({ request }) => {
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

function renderPage(url = "/pacientes") {
  const router = createMemoryRouter(
    [
      { path: "/pacientes", element: <PatientsListPage /> },
      { path: "/pacientes/*", element: <p>Outra tela</p> },
    ],
    { initialEntries: [url] },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const last = <T,>(items: T[]) => items[items.length - 1];

describe("filtros da URL", () => {
  it("converte a URL em parâmetros da API sem expor enums", () => {
    const filters = parseFilters(
      new URLSearchParams("filtro=rascunhos&acesso=falha&busca= ana &ordem=nome&pagina=3"),
    );
    expect(toApiQuery(filters)).toEqual({
      page: 2,
      size: 20,
      sort: "fullName,asc",
      q: "ana",
      emailDeliveryStatus: "FAILED",
      hasOpenDraft: true,
    });
    expect(toSearchParams(filters).toString()).toBe(
      "busca=ana&acesso=falha&filtro=rascunhos&ordem=nome&pagina=3",
    );
  });

  it("ignora valores inválidos e omite o padrão", () => {
    const filters = parseFilters(new URLSearchParams("acesso=FAILED&ordem=x&pagina=-2&filtro=y"));
    expect(toApiQuery(filters)).toEqual({ page: 0, size: 20, sort: "createdAt,desc" });
    expect(toSearchParams(filters).toString()).toBe("");
  });
});

describe("Pacientes", () => {
  it("lista a página e conta pelo totalElements do filtro", async () => {
    mockApi(() => ({ content: [patient(2), patient(1)], totalElements: 42, totalPages: 3 }));
    renderPage();

    const table = await screen.findByRole("table");
    expect(
      within(table)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Paciente 2", "Paciente 1"]);
    expect(screen.getByText("42 pacientes")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("lê os filtros da URL e os envia ao servidor", async () => {
    const queries = mockApi(() => ({ content: [patient(1)] }));
    renderPage("/pacientes?filtro=rascunhos&acesso=falha&ordem=nome&busca=ana");

    await screen.findByRole("table");
    expect(Object.fromEntries(queries[0])).toEqual({
      page: "0",
      size: "20",
      sort: "fullName,asc",
      q: "ana",
      emailDeliveryStatus: "FAILED",
      hasOpenDraft: "true",
    });
    expect(screen.getByRole("button", { name: "Rascunhos em aberto" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Falha no envio" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Buscar paciente")).toHaveValue("ana");
  });

  it("busca com debounce e reflete na URL", async () => {
    const queries = mockApi(() => ({ content: [patient(1)] }));
    const router = renderPage();
    const user = userEvent.setup();

    await screen.findByRole("table");
    await user.type(screen.getByLabelText("Buscar paciente"), "ana");
    expect(queries).toHaveLength(1);

    await waitFor(() => expect(last(queries).get("q")).toBe("ana"));
    expect(queries).toHaveLength(2);
    expect(router.state.location.search).toBe("?busca=ana");
  });

  it("filtros e ordenação voltam à primeira página e atualizam a URL", async () => {
    const queries = mockApi(() => ({ content: [patient(1)], totalElements: 60, totalPages: 3 }));
    const router = renderPage("/pacientes?pagina=2");
    const user = userEvent.setup();

    await screen.findByRole("table");
    expect(last(queries).get("page")).toBe("1");

    await user.click(screen.getByRole("button", { name: "Envio pendente" }));
    await waitFor(() => expect(last(queries).get("emailDeliveryStatus")).toBe("PENDING"));
    expect(last(queries).get("page")).toBe("0");

    await user.click(screen.getByRole("button", { name: "Rascunhos em aberto" }));
    await waitFor(() => expect(last(queries).get("hasOpenDraft")).toBe("true"));

    await user.selectOptions(screen.getByLabelText("Ordenar por"), "Mais antigos");
    await waitFor(() => expect(last(queries).get("sort")).toBe("createdAt,asc"));

    expect(router.state.location.search).toBe("?acesso=pendente&filtro=rascunhos&ordem=antigos");
  });

  it("pagina", async () => {
    const queries = mockApi(() => ({ content: [patient(1)], totalElements: 40, totalPages: 2 }));
    const router = renderPage();
    const user = userEvent.setup();

    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Próxima" }));

    await waitFor(() => expect(last(queries).get("page")).toBe("1"));
    expect(router.state.location.search).toBe("?pagina=2");
    expect(await screen.findByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("mostra o vazio sem filtro com a ação de adicionar", async () => {
    mockApi(() => ({ content: [] }));
    const router = renderPage();

    expect(await screen.findByText("Nenhum paciente ainda")).toBeInTheDocument();
    const [, empty] = screen.getAllByRole("button", { name: "Adicionar paciente" });
    await userEvent.setup().click(empty);
    expect(router.state.location.pathname).toBe("/pacientes/novo");
  });

  it("mostra o vazio com filtro e limpa busca e filtros", async () => {
    const queries = mockApi((q) =>
      q.get("q") || q.get("emailDeliveryStatus") ? { content: [] } : { content: [patient(1)] },
    );
    const router = renderPage("/pacientes?busca=zzz&acesso=falha");
    const user = userEvent.setup();

    expect(await screen.findByText("Nenhum paciente encontrado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(router.state.location.search).toBe("");
    expect(screen.getByLabelText("Buscar paciente")).toHaveValue("");
    expect(last(queries).has("q")).toBe(false);
  });

  it("oferece nova tentativa quando a lista falha", async () => {
    server.use(
      http.get("*/api/v1/me", () => HttpResponse.json({ fullName: "Marina" })),
      http.get("*/api/v1/nutritionists/me/patients", () => HttpResponse.error()),
    );
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível falar com o servidor",
    );
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("oferece reenviar acesso só para envio pendente ou com falha, depois de confirmar", async () => {
    let resentTo: string | undefined;
    mockApi(() => ({ content: [patient(1), patient(2, "FAILED"), patient(3, "PENDING")] }));
    server.use(
      http.post("*/api/v1/nutritionists/me/patients/:patientId/access-email", ({ params }) => {
        resentTo = String(params.patientId);
        return new HttpResponse(null, { status: 202 });
      }),
    );
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: /Reenviar acesso para Paciente 1/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Reenviar acesso para Paciente 3/ })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Reenviar acesso para Paciente 2/ }));
    const dialog = await screen.findByRole("alertdialog", { name: "Reenviar acesso?" });
    expect(resentTo).toBeUndefined();
    await user.click(within(dialog).getByRole("button", { name: "Reenviar acesso" }));

    expect(await screen.findByText("Acesso reenviado para Paciente 2.")).toBeInTheDocument();
    expect(resentTo).toBe("p2");
  });
});
