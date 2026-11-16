import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/server";
import { CreateNutritionistPage } from ".";
import { renderRoutes } from "./test-utils";

const routes = [
  { path: "/admin/usuarios/novo", element: <CreateNutritionistPage /> },
  { path: "/admin/usuarios/:id", element: <p>Detalhe</p> },
  { path: "/admin/usuarios", element: <p>Lista</p> },
];

async function fill(name: string, email: string, registry = "") {
  if (name) await userEvent.type(screen.getByLabelText("Nome completo"), name);
  if (email) await userEvent.type(screen.getByLabelText("E-mail"), email);
  if (registry) await userEvent.type(screen.getByLabelText(/Registro profissional/), registry);
  await userEvent.click(screen.getByRole("button", { name: "Cadastrar nutricionista" }));
}

describe("cadastro de nutricionista", () => {
  it("envia nome, e-mail e registro e abre o detalhe", async () => {
    let body: unknown;
    server.use(
      http.post("*/api/v1/admin/nutritionists", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "new-id", accessEmailStatus: "PENDING" });
      }),
    );
    renderRoutes(routes, "/admin/usuarios/novo");

    await fill("Ana Souza", "ana@exemplo.com", "CRN-3 12345");

    expect(await screen.findByText("Detalhe")).toBeInTheDocument();
    expect(body).toEqual({
      fullName: "Ana Souza",
      email: "ana@exemplo.com",
      registrationNumber: "CRN-3 12345",
    });
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/usuarios/new-id");
  });

  it("omite o registro quando vazio", async () => {
    let body: unknown;
    server.use(
      http.post("*/api/v1/admin/nutritionists", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "x" });
      }),
    );
    renderRoutes(routes, "/admin/usuarios/novo");
    await fill("Ana Souza", "ana@exemplo.com");
    await screen.findByText("Detalhe");
    expect(body).toEqual({ fullName: "Ana Souza", email: "ana@exemplo.com" });
  });

  it("valida os campos obrigatórios sem chamar a API", async () => {
    renderRoutes(routes, "/admin/usuarios/novo");
    await fill("", "isso-nao-e-email");
    expect(screen.getByText("Informe o nome completo.")).toBeInTheDocument();
    expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
  });

  it("mostra o erro de e-mail em uso no campo", async () => {
    server.use(
      http.post("*/api/v1/admin/nutritionists", () =>
        HttpResponse.json({ status: 409, code: "CONFLICT", message: "x" }, { status: 409 }),
      ),
    );
    renderRoutes(routes, "/admin/usuarios/novo");
    await fill("Ana Souza", "ana@exemplo.com");
    expect(await screen.findByText("Já existe uma conta com este e-mail.")).toBeInTheDocument();
    expect(screen.queryByText("Detalhe")).not.toBeInTheDocument();
  });

  it("mostra erros por campo vindos do servidor", async () => {
    server.use(
      http.post("*/api/v1/admin/nutritionists", () =>
        HttpResponse.json(
          {
            status: 400,
            code: "VALIDATION_ERROR",
            errors: [
              { field: "registrationNumber", code: "SIZE", message: "Registro muito longo." },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    renderRoutes(routes, "/admin/usuarios/novo");
    await fill("Ana Souza", "ana@exemplo.com", "123");
    expect(await screen.findByText("Registro muito longo.")).toBeInTheDocument();
  });

  it("avisa de falha do servidor e de rede, mantendo os dados", async () => {
    server.use(
      http.post("*/api/v1/admin/nutritionists", () =>
        HttpResponse.json({ status: 500, code: "INTERNAL" }, { status: 500 }),
      ),
    );
    renderRoutes(routes, "/admin/usuarios/novo");
    await fill("Ana Souza", "ana@exemplo.com");
    expect(
      await screen.findByText("Não foi possível cadastrar o nutricionista"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Ana Souza");

    server.use(http.post("*/api/v1/admin/nutritionists", () => HttpResponse.error()));
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar nutricionista" }));
    expect(
      await screen.findByText("Não foi possível falar com o servidor. Tente de novo."),
    ).toBeInTheDocument();
  });

  it("cancela de volta para a lista", async () => {
    renderRoutes(routes, "/admin/usuarios/novo");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.getByText("Lista")).toBeInTheDocument());
  });
});
