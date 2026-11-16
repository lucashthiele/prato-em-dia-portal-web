import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { server } from "../../test/server";
import { NewPatientPage, PatientPage } from ".";

function mockCreate(respond: () => Response) {
  const bodies: unknown[] = [];
  server.use(
    http.post("*/api/v1/nutritionists/me/patients", async ({ request }) => {
      bodies.push(await request.json());
      return respond();
    }),
    http.get("*/api/v1/nutritionists/me/patients/:id", () =>
      HttpResponse.json({
        patientId: "p9",
        patientFullName: "Ana Ribeiro",
        patientEmail: "ana@exemplo.com",
        relationshipStatus: "ACTIVE",
        emailDeliveryStatus: "SENT",
      }),
    ),
    http.get("*/api/v1/nutritionists/me/patients/:id/prescriptions", () => HttpResponse.json([])),
  );
  return bodies;
}

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: "/pacientes", element: <p>Lista de pacientes</p> },
      { path: "/pacientes/novo", element: <NewPatientPage /> },
      { path: "/pacientes/:patientId", element: <PatientPage /> },
    ],
    { initialEntries: ["/pacientes/novo"] },
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

async function fill(name: string, email: string) {
  if (name) await userEvent.type(screen.getByLabelText("Nome completo"), name);
  if (email) await userEvent.type(screen.getByLabelText("E-mail"), email);
  await userEvent.click(screen.getByRole("button", { name: "Cadastrar paciente" }));
}

function apiError(status: number, code: string) {
  return HttpResponse.json({ code, message: code }, { status });
}

describe("Cadastro de paciente", () => {
  it("valida nome e e-mail antes de enviar", async () => {
    const bodies = mockCreate(() => HttpResponse.json({}));
    renderPage();

    await fill("", "");
    expect(screen.getByText("Informe o nome completo.")).toBeVisible();
    expect(screen.getByText("Informe o e-mail.")).toBeVisible();

    await userEvent.type(screen.getByLabelText("Nome completo"), "Ana Ribeiro");
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar paciente" }));
    expect(screen.getByText("Informe um e-mail válido.")).toBeVisible();
    expect(bodies).toEqual([]);
  });

  it("cadastra e abre a página do paciente com o aviso do e-mail", async () => {
    const bodies = mockCreate(() =>
      HttpResponse.json({
        patientId: "p9",
        patientFullName: "Ana Ribeiro",
        patientEmail: "ana@exemplo.com",
        relationshipStatus: "ACTIVE",
        emailDeliveryStatus: "SENT",
      }),
    );
    const router = renderPage();

    await fill("  Ana Ribeiro ", " ana@exemplo.com ");

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Ribeiro" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/pacientes/p9");
    expect(bodies).toEqual([{ fullName: "Ana Ribeiro", email: "ana@exemplo.com" }]);
    expect(await screen.findByText("E-mail de acesso enviado para ana@exemplo.com.")).toBeVisible();
  });

  it("cancela de volta para a lista", async () => {
    mockCreate(() => HttpResponse.json({}));
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText("Lista de pacientes")).toBeVisible();
  });

  it("mostra o conflito com outro nutricionista no campo de e-mail", async () => {
    mockCreate(() => apiError(409, "RELATIONSHIP_CONFLICT"));
    renderPage();
    await fill("Ana Ribeiro", "ana@exemplo.com");
    expect(
      await screen.findByText(
        "Este e-mail já está vinculado a outro nutricionista. Transferência não está disponível no piloto.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toBeInvalid();
  });

  it("mostra o conflito de conta no campo de e-mail sem revelar o papel", async () => {
    mockCreate(() => apiError(409, "PATIENT_ACCOUNT_CONFLICT"));
    renderPage();
    await fill("Ana Ribeiro", "ana@exemplo.com");
    expect(
      await screen.findByText(
        "Este e-mail não pode ser usado para cadastrar um paciente. Confira o endereço ou fale com a administração do Prato em Dia.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/nutricionista|admin/i, { selector: "p p" })).toBeNull();
  });

  it("trata RELATIONSHIP_ALREADY_EXISTS como erro genérico, sem o link Abrir paciente", async () => {
    mockCreate(() => apiError(409, "RELATIONSHIP_ALREADY_EXISTS"));
    renderPage();
    await fill("Ana Ribeiro", "ana@exemplo.com");
    expect(
      await screen.findByText("Não foi possível cadastrar o paciente. Tente de novo em instantes."),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: "Abrir paciente" })).toBeNull();
  });

  it("mostra erro genérico em falha do servidor e permite tentar de novo", async () => {
    mockCreate(() => apiError(500, "INTERNAL_ERROR"));
    renderPage();
    await fill("Ana Ribeiro", "ana@exemplo.com");
    expect(
      await screen.findByText("Não foi possível cadastrar o paciente. Tente de novo em instantes."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Cadastrar paciente" })).toBeEnabled();
  });

  it("mostra erros de campo devolvidos pelo servidor", async () => {
    mockCreate(() =>
      HttpResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "x",
          errors: [{ field: "email", code: "invalid", message: "E-mail inválido." }],
        },
        { status: 400 },
      ),
    );
    renderPage();
    await fill("Ana Ribeiro", "ana@exemplo.com");
    expect(await screen.findByText("E-mail inválido.")).toBeVisible();
  });
});
