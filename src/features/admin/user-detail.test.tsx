import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/server";
import { UserDetailPage } from ".";
import { ADMIN_ID, mockMe, renderRoutes, user, type AdminUser } from "./test-utils";

const routes = [
  { path: "/admin/usuarios/:id", element: <UserDetailPage /> },
  { path: "/admin/usuarios", element: <p>Lista</p> },
  { path: "/admin/auditoria", element: <p>Auditoria</p> },
];

/** Serve o usuário e guarda as mudanças de status recebidas. */
function mockUser(initial: AdminUser) {
  let current = initial;
  const changes: unknown[] = [];
  const resends: string[] = [];
  server.use(
    http.get("*/api/v1/admin/users/:id", () => HttpResponse.json(current)),
    http.patch("*/api/v1/admin/users/:id/status", async ({ request }) => {
      const body = (await request.json()) as { status: string; endRelationships: boolean };
      changes.push(body);
      current = { ...current, status: body.status };
      return new HttpResponse(null, { status: 204 });
    }),
    http.post("*/api/v1/admin/nutritionists/:id/access-email", ({ params }) => {
      resends.push(String(params.id));
      return new HttpResponse(null, { status: 202 });
    }),
  );
  return { changes, resends };
}

const url = (u: AdminUser) => `/admin/usuarios/${u.id}`;

describe("detalhe do usuário", () => {
  it("mostra os dados e o estado do e-mail de acesso", async () => {
    mockMe();
    const u = user(1, { registrationNumber: "CRN-3 1", accessEmail: { status: "FAILED" } });
    mockUser(u);
    renderRoutes(routes, url(u));

    expect(await screen.findByRole("heading", { name: "Usuário 1" })).toBeInTheDocument();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getByText("Falha no envio")).toBeInTheDocument();
    expect(screen.getByText("CRN-3 1")).toBeInTheDocument();
    expect(screen.getByText("Nutricionista")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver na auditoria" })).toHaveAttribute(
      "href",
      `/admin/auditoria?alvo=${u.id}`,
    );
  });

  it("reenvia o e-mail de acesso do nutricionista", async () => {
    mockMe();
    const u = user(1, { accessEmail: { status: "SENT" } });
    const { resends } = mockUser(u);
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Reenviar e-mail" }));

    expect(
      await screen.findByText(`E-mail de acesso reenviado para ${u.email}.`),
    ).toBeInTheDocument();
    expect(resends).toEqual([u.id]);
  });

  it("avisa quando o reenvio falha", async () => {
    mockMe();
    const u = user(1, { accessEmail: { status: "FAILED" } });
    mockUser(u);
    server.use(
      http.post("*/api/v1/admin/nutritionists/:id/access-email", () =>
        HttpResponse.json({ status: 500, code: "INTERNAL_ERROR" }, { status: 500 }),
      ),
    );
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Reenviar e-mail" }));

    expect(await screen.findByText("Não foi possível reenviar o e-mail")).toBeInTheDocument();
    expect(screen.getByText("Tente novamente em instantes.")).toBeInTheDocument();
  });

  it("explica ACCESS_EMAIL_NOT_AVAILABLE no reenvio", async () => {
    mockMe();
    const u = user(1, { accessEmail: { status: "FAILED" } });
    mockUser(u);
    server.use(
      http.post("*/api/v1/admin/nutritionists/:id/access-email", () =>
        HttpResponse.json(
          { status: 409, code: "ACCESS_EMAIL_NOT_AVAILABLE", message: "x" },
          { status: 409 },
        ),
      ),
    );
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Reenviar e-mail" }));

    expect(await screen.findByText("Não foi possível reenviar o e-mail")).toBeInTheDocument();
    expect(
      screen.getByText(
        "O reenvio só vale para nutricionista com conta ativa que ainda não definiu a senha.",
      ),
    ).toBeInTheDocument();
  });

  it("não oferece reenvio para paciente, administrador, conta desativada nem senha já definida", async () => {
    mockMe();
    for (const patch of [
      { role: "PATIENT", accessEmail: { status: "SENT" } },
      { role: "ADMIN" },
      { status: "INACTIVE" },
      { passwordChangeRequired: false },
    ]) {
      const u = user(1, patch);
      mockUser(u);
      renderRoutes(routes, url(u));
      await screen.findByRole("heading", { name: "Usuário 1" });
      expect(screen.queryByRole("button", { name: "Reenviar e-mail" })).not.toBeInTheDocument();
      document.body.innerHTML = "";
    }
  });

  it("acompanha o envio pendente do e-mail", async () => {
    mockMe();
    const u = user(1, { accessEmail: { status: "PENDING" } });
    mockUser(u);
    renderRoutes(routes, url(u));
    expect(await screen.findByText("Envio pendente")).toBeInTheDocument();
  });

  it("mostra o aviso de cadastro concluído", async () => {
    mockMe();
    const u = user(1);
    mockUser(u);
    const router = renderRoutes(routes, url(u));
    await screen.findByRole("heading", { name: "Usuário 1" });
    expect(screen.queryByText("Nutricionista cadastrado.")).not.toBeInTheDocument();
    await router.navigate(url(u), { state: { created: true } });
    expect(await screen.findByText("Nutricionista cadastrado.")).toBeInTheDocument();
  });

  it("mostra usuário não encontrado", async () => {
    mockMe();
    server.use(
      http.get("*/api/v1/admin/users/:id", () =>
        HttpResponse.json({ status: 404, code: "NOT_FOUND" }, { status: 404 }),
      ),
    );
    renderRoutes(routes, "/admin/usuarios/x");
    expect(await screen.findByText("Usuário não encontrado")).toBeInTheDocument();
  });

  it("mostra erro com nova tentativa", async () => {
    mockMe();
    server.use(
      http.get("*/api/v1/admin/users/:id", () =>
        HttpResponse.json({ status: 500, code: "INTERNAL" }, { status: 500 }),
      ),
    );
    renderRoutes(routes, "/admin/usuarios/x");
    expect(await screen.findByText("Não foi possível carregar o usuário")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});

describe("ativar e desativar", () => {
  it("desativa nutricionista com o texto da Q22b e as três ações", async () => {
    mockMe();
    const u = user(1, { fullName: "Ana Souza" });
    const { changes } = mockUser(u);
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Desativar conta" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Desativar Ana Souza?")).toBeInTheDocument();
    expect(within(dialog).getByText("Ana não poderá mais entrar no portal.")).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Cancelar", "Somente desativar", "Desativar e encerrar vínculos"]);
    expect(
      within(dialog).getByText(
        "Os vínculos com todos os pacientes de Ana são encerrados e as prescrições dela são arquivadas. Os pacientes deixam de receber novos planos e ficam livres para ser cadastrados por outro nutricionista. O histórico de registros é mantido.",
      ),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Somente desativar" }));

    await waitFor(() => expect(changes).toEqual([{ status: "INACTIVE", endRelationships: false }]));
    expect(await screen.findByText("Desativada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar conta" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("desativa e encerra os vínculos na terceira ação", async () => {
    mockMe();
    const u = user(1, { fullName: "Ana Souza" });
    const { changes } = mockUser(u);
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Desativar conta" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Desativar e encerrar vínculos" }),
    );

    await waitFor(() => expect(changes).toEqual([{ status: "INACTIVE", endRelationships: true }]));
    expect(await screen.findByText("Desativada")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("não oferece encerrar vínculos para paciente nem na ativação", async () => {
    mockMe();
    const patient = user(1, { role: "PATIENT" });
    mockUser(patient);
    renderRoutes(routes, url(patient));
    await userEvent.click(await screen.findByRole("button", { name: "Desativar conta" }));
    expect(
      within(await screen.findByRole("alertdialog")).queryByRole("button", {
        name: "Desativar e encerrar vínculos",
      }),
    ).not.toBeInTheDocument();
  });

  it("explica END_RELATIONSHIPS_NOT_APPLICABLE (400)", async () => {
    mockMe();
    const u = user(1);
    mockUser(u);
    server.use(
      http.patch("*/api/v1/admin/users/:id/status", () =>
        HttpResponse.json(
          { status: 400, code: "END_RELATIONSHIPS_NOT_APPLICABLE", message: "x" },
          { status: 400 },
        ),
      ),
    );
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Desativar conta" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Desativar e encerrar vínculos",
      }),
    );

    expect(await screen.findByText("Não foi possível desativar a conta")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Só é possível encerrar vínculos ao desativar um nutricionista. Atualize a página e tente de novo.",
      ),
    ).toBeInTheDocument();
  });

  it("explica ADMIN_CANNOT_CHANGE_OWN_STATUS (409)", async () => {
    mockMe();
    const u = user(1);
    mockUser(u);
    server.use(
      http.patch("*/api/v1/admin/users/:id/status", () =>
        HttpResponse.json(
          { status: 409, code: "ADMIN_CANNOT_CHANGE_OWN_STATUS", message: "x" },
          { status: 409 },
        ),
      ),
    );
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Desativar conta" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Somente desativar",
      }),
    );

    expect(
      await screen.findByText("Você não pode alterar a situação da sua própria conta."),
    ).toBeInTheDocument();
  });

  it("desativa paciente com o texto da Q23", async () => {
    mockMe();
    const u = user(1, { fullName: "Maria Lima", role: "PATIENT" });
    const { changes } = mockUser(u);
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Desativar conta" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Desativar a conta de Maria Lima?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Maria não poderá mais entrar no app. O vínculo com o nutricionista e o histórico de registros continuam. Para liberar Maria para outro nutricionista, o nutricionista atual deve encerrar o vínculo.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Desativar conta" }));
    await waitFor(() => expect(changes).toEqual([{ status: "INACTIVE", endRelationships: false }]));
  });

  it("ativa conta desativada depois de confirmar", async () => {
    mockMe();
    const u = user(1, { fullName: "Ana Souza", status: "INACTIVE" });
    const { changes } = mockUser(u);
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Ativar conta" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Ativar a conta de Ana Souza?")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Ativar conta" }));

    await waitFor(() => expect(changes).toEqual([{ status: "ACTIVE", endRelationships: false }]));
    expect(await screen.findByText("Ativa")).toBeInTheDocument();
  });

  it("cancelar não muda nada", async () => {
    mockMe();
    const u = user(1);
    const { changes } = mockUser(u);
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Desativar conta" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }),
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(changes).toEqual([]);
  });

  it("avisa quando a mudança falha", async () => {
    mockMe();
    const u = user(1);
    mockUser(u);
    server.use(
      http.patch("*/api/v1/admin/users/:id/status", () =>
        HttpResponse.json({ status: 500, code: "INTERNAL" }, { status: 500 }),
      ),
    );
    renderRoutes(routes, url(u));

    await userEvent.click(await screen.findByRole("button", { name: "Desativar conta" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Somente desativar",
      }),
    );

    expect(await screen.findByText("Não foi possível desativar a conta")).toBeInTheDocument();
  });

  it("não deixa o admin desativar a própria conta", async () => {
    mockMe();
    const u = user(1, { id: ADMIN_ID, role: "ADMIN" });
    mockUser(u);
    renderRoutes(routes, url(u));

    await screen.findByRole("heading", { name: "Usuário 1" });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Desativar conta" })).not.toBeInTheDocument(),
    );
  });
});
