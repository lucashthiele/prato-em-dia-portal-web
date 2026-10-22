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

type Summary = components["schemas"]["NutritionistSummaryOutput"];

function summary(
  overrides: Partial<NonNullable<Summary["counts"]>> = {},
  drafts: Summary["drafts"] = [],
) {
  return {
    counts: {
      activePatients: 3,
      pendingAccess: 0,
      failedAccess: 0,
      openDrafts: drafts.length,
      ...overrides,
    },
    drafts,
  } satisfies Summary;
}

function draft(n: number): NonNullable<Summary["drafts"]>[number] {
  return {
    patientId: `p${n}`,
    patientFullName: `Paciente ${n}`,
    prescriptionId: `rx${n}`,
    versionId: `v${n}`,
    title: `Plano ${n}`,
    versionNumber: n,
    updatedAt: `2026-10-0${n}T10:00:00Z`,
  };
}

function mockApi(content: Patient[], data: Summary = summary({ activePatients: content.length })) {
  server.use(
    http.get("*/api/v1/me", () => HttpResponse.json({ fullName: "Marina Souza Lima" })),
    http.get("*/api/v1/nutritionists/me/summary", () => HttpResponse.json(data)),
    http.get("*/api/v1/nutritionists/me/patients", () =>
      HttpResponse.json({
        content,
        page: 0,
        size: 50,
        totalElements: content.length,
        totalPages: 1,
      }),
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
  it("mostra saudação, métricas do resumo e pacientes recentes do mais novo para o mais antigo", async () => {
    mockApi(
      [patient(1), patient(3), patient(2)],
      summary({ activePatients: 3, pendingAccess: 2, failedAccess: 1, openDrafts: 4 }),
    );
    renderHome();

    expect(await screen.findByRole("heading", { name: "Olá, Marina" })).toBeInTheDocument();
    expect(screen.getByText("Pacientes ativos").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Aguardando cadastro").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Acessos com falha").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Rascunhos em aberto").nextSibling).toHaveTextContent("4");

    const recent = await screen.findByRole("region", { name: "Pacientes recentes" });
    const names = within(recent)
      .getAllByRole("link", { name: /Paciente \d/ })
      .map((link) => link.textContent);
    expect(names).toEqual(["Paciente 3", "Paciente 2", "Paciente 1"]);
  });

  it("lista rascunhos na ordem recebida e abre a prescrição do paciente", async () => {
    mockApi([patient(1)], summary({ activePatients: 1 }, [draft(2), draft(1)]));
    const router = renderHome();

    const list = await screen.findByRole("region", { name: "Rascunhos para continuar" });
    const links = within(list).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      expect.stringContaining("Paciente 2"),
      expect.stringContaining("Paciente 1"),
    ]);
    expect(within(list).getAllByText("Rascunho")).toHaveLength(2);
    expect(within(list).queryByText(/Mostrando/)).not.toBeInTheDocument();

    await userEvent.setup().click(links[0]);
    expect(router.state.location.pathname).toBe("/pacientes/p2/prescricao");
  });

  it("avisa quando há mais rascunhos em aberto do que os listados", async () => {
    mockApi([patient(1)], {
      ...summary({ activePatients: 1 }, [draft(1)]),
      counts: { activePatients: 1, openDrafts: 7 },
    });
    renderHome();

    expect(await screen.findByText("Mostrando 1 de 7 rascunhos em aberto.")).toBeInTheDocument();
  });

  it("não mostra 'Rascunhos para continuar' sem rascunhos", async () => {
    mockApi([patient(1)]);
    renderHome();

    await screen.findByRole("region", { name: "Pacientes recentes" });
    expect(
      screen.queryByRole("region", { name: "Rascunhos para continuar" }),
    ).not.toBeInTheDocument();
  });

  it("lista só acessos com falha em 'Precisam de atenção'", async () => {
    mockApi(
      [patient(1), patient(2, "FAILED"), patient(3, "PENDING")],
      summary({ failedAccess: 1, pendingAccess: 1 }),
    );
    renderHome();

    const attention = await screen.findByRole("region", { name: "Precisam de atenção" });
    expect(within(attention).getByText("Paciente 2")).toBeInTheDocument();
    expect(within(attention).queryByText("Paciente 3")).not.toBeInTheDocument();
    expect(within(attention).queryByText("Paciente 1")).not.toBeInTheDocument();
  });

  it("não mostra 'Precisam de atenção' quando nenhum acesso falhou", async () => {
    mockApi([patient(1), patient(2, "PENDING")]);
    renderHome();

    await screen.findByRole("region", { name: "Pacientes recentes" });
    expect(screen.queryByRole("region", { name: "Precisam de atenção" })).not.toBeInTheDocument();
  });

  it("reenvia o acesso depois de confirmar", async () => {
    let resentTo: string | undefined;
    mockApi([patient(2, "FAILED")], summary({ activePatients: 1, failedAccess: 1 }));
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
    mockApi([], summary({ activePatients: 0 }));
    const router = renderHome();

    expect(await screen.findByText("Nenhum paciente ainda")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Adicionar paciente" }));
    expect(router.state.location.pathname).toBe("/pacientes/novo");
  });

  it("oferece nova tentativa quando o resumo falha", async () => {
    server.use(
      http.get("*/api/v1/me", () => HttpResponse.json({ fullName: "Marina" })),
      http.get("*/api/v1/nutritionists/me/summary", () => HttpResponse.error()),
      http.get("*/api/v1/nutritionists/me/patients", () => HttpResponse.error()),
    );
    renderHome();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível falar com o servidor",
    );
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
