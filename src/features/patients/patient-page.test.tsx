import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { components } from "../../shared/api";
import { server } from "../../test/server";
import { PatientPage } from ".";

type Patient = components["schemas"]["RelationshipOutput"];
type Prescription = components["schemas"]["PrescriptionOutput"];

const PATIENT_ID = "p1";

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    relationshipId: "r1",
    patientId: PATIENT_ID,
    patientFullName: "Ana Ribeiro",
    patientEmail: "ana@exemplo.com",
    relationshipStatus: "ACTIVE",
    emailDeliveryStatus: "SENT",
    createdAt: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

const prescription: Prescription = {
  id: "rx1",
  patientId: PATIENT_ID,
  planningMode: "SUBSTITUTIONS_ONLY",
  status: "ACTIVE",
  versions: [
    {
      id: "v1",
      number: 1,
      status: "ARCHIVED",
      title: "Primeira versão",
      createdAt: "2026-09-01T10:00:00Z",
      publishedAt: "2026-09-02T10:00:00Z",
      meals: [],
    },
    {
      id: "v2",
      number: 2,
      status: "PUBLISHED",
      title: "Plano de outubro",
      notes: "Beber água.",
      createdAt: "2026-10-01T10:00:00Z",
      publishedAt: "2026-10-02T10:00:00Z",
      nutritionTargets: [{ nutrientCode: "protein", amount: 90, unit: "g" }],
      meals: [
        {
          id: "m1",
          name: "Café da manhã",
          mealType: "BREAKFAST",
          order: 1,
          suggestedTime: "07:30:00",
          items: [
            {
              id: "i1",
              foodId: "f1",
              quantity: 2,
              unit: "unidade",
              order: 1,
              substitutions: [{ id: "s1", foodId: "f2", quantity: 50, unit: "g" }],
            },
          ],
        },
      ],
    },
    {
      id: "v3",
      number: 3,
      status: "DRAFT",
      createdAt: "2026-10-20T10:00:00Z",
      meals: [],
    },
  ],
};

interface Options {
  patient?: Patient;
  prescriptions?: Prescription[];
  status?: number;
}

function mockApi({
  patient: data = patient(),
  prescriptions = [prescription],
  status,
}: Options = {}) {
  const calls: string[] = [];
  server.use(
    http.get("*/api/v1/nutritionists/me/patients/:id", () =>
      status ? new HttpResponse(null, { status }) : HttpResponse.json(data),
    ),
    http.get("*/api/v1/nutritionists/me/patients/:id/prescriptions", () =>
      HttpResponse.json(prescriptions),
    ),
    http.get("*/api/v1/foods/:id", ({ params }) =>
      HttpResponse.json({ id: params.id, name: params.id === "f1" ? "Ovo cozido" : "Queijo" }),
    ),
    http.post("*/api/v1/nutritionists/me/patients/:id/access-email", () => {
      calls.push("resend");
      return new HttpResponse(null, { status: 202 });
    }),
    http.delete("*/api/v1/nutritionists/me/patients/:id/relationship", () => {
      calls.push("end");
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return calls;
}

function renderPage(url = `/pacientes/${PATIENT_ID}`) {
  const router = createMemoryRouter(
    [
      { path: "/pacientes", element: <p>Lista de pacientes</p> },
      { path: "/pacientes/:patientId", element: <PatientPage /> },
      { path: "/pacientes/:patientId/prescricao/nova", element: <p>Nova versão em breve</p> },
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

describe("Tela de paciente", () => {
  it("mostra o cabeçalho, a prescrição vigente, o rascunho e o histórico sem expor enums", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Ribeiro" })).toBeVisible();
    expect(screen.getByText("ana@exemplo.com")).toBeVisible();
    expect(screen.getByText("Vínculo ativo")).toBeVisible();

    expect(await screen.findByText("Há um rascunho não publicado")).toBeVisible();
    expect(await screen.findByText(/Plano de outubro · publicada em/)).toHaveTextContent(
      "Permitir substituições",
    );
    expect(screen.getByText("Beber água.")).toBeVisible();
    expect(screen.getByText("Proteínas")).toBeVisible();
    expect(await screen.findByText("Ovo cozido")).toBeVisible();
    const items = screen.getByRole("table", { name: "Itens de Café da manhã" });
    expect(await within(items).findByRole("row", { name: /Ovo cozido 2 unidades/ })).toBeVisible();
    expect(await within(items).findByRole("row", { name: /ou Queijo 50 g/ })).toBeVisible();
    expect(screen.getByText("07:30")).toBeVisible();
    expect(screen.getByText("1 item")).toBeVisible();
    expect(screen.getByText("Café da manhã")).toBeVisible();

    expect(screen.getByText("Primeira versão")).toBeVisible();
    expect(screen.queryByText(/SUBSTITUTIONS_ONLY|PUBLISHED|ARCHIVED|BREAKFAST/)).toBeNull();
  });

  it("mostra estado vazio sem prescrição", async () => {
    mockApi({ prescriptions: [] });
    renderPage();
    expect(await screen.findByText("Nenhuma prescrição ainda")).toBeVisible();
  });

  it("explica quando o paciente não é encontrado", async () => {
    mockApi({ status: 404 });
    renderPage();
    expect(await screen.findByText("Paciente não encontrado")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Voltar para Pacientes" }));
    expect(await screen.findByText("Lista de pacientes")).toBeVisible();
  });

  it("trata um id inválido como paciente não encontrado", async () => {
    mockApi({ status: 400 });
    renderPage("/pacientes/abc");
    expect(await screen.findByText("Paciente não encontrado")).toBeVisible();
  });

  it("alterna a aba pela URL e pelo teclado", async () => {
    mockApi();
    const router = renderPage();
    await screen.findByRole("heading", { level: 1 });

    const tabs = screen.getByRole("tablist", { name: "Paciente" });
    const prescription = within(tabs).getByRole("tab", { name: "Prescrição" });
    expect(prescription).toHaveAttribute("aria-selected", "true");

    prescription.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(router.state.location.search).toBe("?aba=acompanhamento");
    expect(screen.getByText("Acompanhamento da semana")).toBeVisible();
    expect(within(tabs).getByRole("tab", { name: "Acompanhamento" })).toHaveFocus();
  });

  it("abre a aba pela URL", async () => {
    mockApi();
    renderPage(`/pacientes/${PATIENT_ID}?aba=acompanhamento`);
    expect(await screen.findByText("Acompanhamento da semana")).toBeVisible();
  });

  it("só oferece reenviar acesso quando o envio está pendente ou falhou", async () => {
    mockApi();
    renderPage();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "Reenviar acesso" })).toBeNull();
  });

  it("reenvia o acesso depois de confirmar", async () => {
    const calls = mockApi({ patient: patient({ emailDeliveryStatus: "FAILED" }) });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Reenviar acesso" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(calls).toEqual([]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Reenviar acesso" }));

    expect(await screen.findByText("Acesso reenviado para Ana Ribeiro.")).toBeVisible();
    expect(calls).toEqual(["resend"]);
  });

  it("encerra o vínculo pelo menu de mais ações, com confirmação", async () => {
    const calls = mockApi();
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Mais ações" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Encerrar vínculo" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(calls).toEqual([]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar vínculo" }));

    expect(await screen.findByText("Lista de pacientes")).toBeVisible();
    expect(calls).toEqual(["end"]);
  });

  it("leva Nova versão para a página em desenvolvimento", async () => {
    mockApi();
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Nova versão" }));
    await waitFor(() => expect(screen.getByText("Nova versão em breve")).toBeVisible());
  });

  it("não oferece ações com o vínculo encerrado", async () => {
    mockApi({ patient: patient({ relationshipStatus: "ENDED" }) });
    renderPage();
    expect(await screen.findByText("Vínculo encerrado", { selector: "span span" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nova versão" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mais ações" })).toBeNull();
  });
});
