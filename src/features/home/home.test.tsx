import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { components } from "../../shared/api";
import { server } from "../../test/server";
import { HomePage } from ".";

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

function mockApi(content: Patient[], totalPages = 1) {
  server.use(
    http.get("*/api/v1/me", () => HttpResponse.json({ fullName: "Marina Souza Lima" })),
    http.get("*/api/v1/nutritionists/me/patients", () =>
      HttpResponse.json({ content, page: 0, size: 50, totalElements: content.length, totalPages }),
    ),
  );
}

function renderHome() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <HomePage /> },
      { path: "/pacientes/*", element: <p>Tela de pacientes</p> },
    ],
    { initialEntries: ["/"] },
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

describe("Início", () => {
  it("mostra saudação, contagens e pacientes recentes do mais novo para o mais antigo", async () => {
    mockApi([patient(1), patient(3), patient(2, "FAILED")]);
    renderHome();

    expect(await screen.findByRole("heading", { name: "Olá, Marina" })).toBeInTheDocument();
    expect(screen.getByText("Pacientes ativos").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Acessos com problema").nextSibling).toHaveTextContent("1");

    const recent = screen.getByRole("region", { name: "Pacientes recentes" });
    const names = within(recent)
      .getAllByRole("link", { name: /Paciente \d/ })
      .map((link) => link.textContent);
    expect(names).toEqual(["Paciente 3", "Paciente 2", "Paciente 1"]);
  });

  it("lista só acessos pendentes ou com falha em 'Precisam de atenção'", async () => {
    mockApi([patient(1), patient(2, "FAILED"), patient(3, "PENDING")]);
    renderHome();

    const attention = await screen.findByRole("region", { name: "Precisam de atenção" });
    expect(within(attention).getByText("Paciente 2")).toBeInTheDocument();
    expect(within(attention).getByText("Paciente 3")).toBeInTheDocument();
    expect(within(attention).queryByText("Paciente 1")).not.toBeInTheDocument();
  });

  it("não mostra 'Precisam de atenção' quando todos os acessos foram enviados", async () => {
    mockApi([patient(1)]);
    renderHome();

    await screen.findByRole("region", { name: "Pacientes recentes" });
    expect(screen.queryByRole("region", { name: "Precisam de atenção" })).not.toBeInTheDocument();
  });

  it("marca a contagem de acessos com problema como parcial quando há mais páginas", async () => {
    mockApi([patient(1, "FAILED")], 2);
    renderHome();

    expect(await screen.findByText("1+")).toBeInTheDocument();
  });

  it("reenvia o acesso depois de confirmar", async () => {
    let resentTo: string | undefined;
    mockApi([patient(2, "FAILED")]);
    server.use(
      http.post("*/api/v1/nutritionists/me/patients/:patientId/access-email", ({ params }) => {
        resentTo = String(params.patientId);
        return new HttpResponse(null, { status: 202 });
      }),
    );
    renderHome();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /Reenviar acesso para Paciente 2/ }),
    );
    const dialog = await screen.findByRole("alertdialog", { name: "Reenviar acesso?" });
    expect(resentTo).toBeUndefined();
    await user.click(within(dialog).getByRole("button", { name: "Reenviar acesso" }));

    expect(await screen.findByText("Acesso reenviado para Paciente 2.")).toBeInTheDocument();
    expect(resentTo).toBe("p2");
  });

  it("mostra o estado vazio com a ação de adicionar paciente", async () => {
    mockApi([]);
    const router = renderHome();

    expect(await screen.findByText("Nenhum paciente ainda")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Adicionar paciente" }));
    expect(router.state.location.pathname).toBe("/pacientes/novo");
  });

  it("leva o tile de rascunhos para Pacientes com o filtro", async () => {
    mockApi([patient(1)]);
    const router = renderHome();

    await userEvent.setup().click(await screen.findByRole("link", { name: /Rascunhos em aberto/ }));
    expect(router.state.location.pathname).toBe("/pacientes");
    expect(router.state.location.search).toBe("?filtro=rascunhos");
  });

  it("oferece nova tentativa quando a listagem falha", async () => {
    server.use(
      http.get("*/api/v1/me", () => HttpResponse.json({ fullName: "Marina" })),
      http.get("*/api/v1/nutritionists/me/patients", () => HttpResponse.error()),
    );
    renderHome();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível falar com o servidor",
    );
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
