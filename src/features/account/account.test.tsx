import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import {
  LoginPage,
  RedirectIfSession,
  RequireConsent,
  RequirePasswordSetup,
  RequireRole,
  RequireSession,
  ConsentPage,
  SessionProvider,
} from "../auth";
import { server } from "../../test/server";
import { AdminProfilePage, ChangePasswordPage, ProfilePage, SetPasswordPage } from ".";

const apiError = (status: number, code: string) =>
  HttpResponse.json({ status, code, message: code, errors: [] }, { status });

interface BackendOptions {
  role?: "ADMIN" | "NUTRITIONIST";
  passwordChangeRequired?: boolean;
  consented?: boolean;
  loggedIn?: boolean;
}

function mockBackend({
  role = "NUTRITIONIST",
  passwordChangeRequired = false,
  consented = true,
  loggedIn = false,
}: BackendOptions = {}) {
  const state = {
    loggedIn,
    passwordChangeRequired,
    consented,
    passwordBodies: [] as unknown[],
    profileBodies: [] as unknown[],
  };
  server.use(
    http.get("*/api/v1/me", () => {
      if (!state.loggedIn) return new HttpResponse(null, { status: 401 });
      if (!state.consented) return apiError(403, "CONSENT_REQUIRED");
      return HttpResponse.json({
        role,
        fullName: "Marina Souza",
        phone: "11999990000",
        registrationNumber: "CRN-3 12345",
        bio: "Nutrição esportiva.",
        birthDate: "1990-05-10",
      });
    }),
    http.post("*/api/v1/auth/refresh", () => new HttpResponse(null, { status: 401 })),
    http.post("*/api/v1/auth/login", () => {
      state.loggedIn = true;
      return HttpResponse.json({
        expiresIn: 900,
        passwordChangeRequired: state.passwordChangeRequired,
      });
    }),
    http.post("*/api/v1/auth/logout", () => {
      state.loggedIn = false;
      return new HttpResponse(null, { status: 204 });
    }),
    http.patch("*/api/v1/me/password", async ({ request }) => {
      state.passwordBodies.push(await request.json());
      state.passwordChangeRequired = false;
      return HttpResponse.json({ expiresIn: 900, passwordChangeRequired: false });
    }),
    http.put("*/api/v1/me", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      state.profileBodies.push(body);
      return HttpResponse.json({ role, ...body });
    }),
    http.get("*/api/v1/me/consents", () =>
      HttpResponse.json({
        upToDate: false,
        documents: [{ documentType: "TERMS_OF_USE", currentVersion: "v1", accepted: false }],
      }),
    ),
  );
  return state;
}

function renderApp(initialPath: string) {
  const router = createMemoryRouter(
    [
      { element: <RedirectIfSession />, children: [{ path: "/login", element: <LoginPage /> }] },
      {
        element: <RequirePasswordSetup />,
        children: [{ path: "/definir-senha", element: <SetPasswordPage /> }],
      },
      { element: <RequireConsent />, children: [{ path: "/termos", element: <ConsentPage /> }] },
      {
        element: <RequireSession />,
        children: [
          {
            element: <RequireRole allow="NUTRITIONIST" />,
            children: [
              {
                element: <Outlet />,
                children: [
                  { path: "/", element: <h1>Início do nutricionista</h1> },
                  { path: "/perfil", element: <ProfilePage /> },
                  { path: "/perfil/senha", element: <ChangePasswordPage /> },
                ],
              },
            ],
          },
          {
            element: <RequireRole allow="ADMIN" />,
            children: [
              { path: "/admin", element: <h1>Área admin</h1> },
              {
                path: "/admin/perfil",
                element: <AdminProfilePage changePasswordPath="/admin/senha" />,
              },
              { path: "/admin/senha", element: <ChangePasswordPage backTo="/admin/perfil" /> },
            ],
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return router;
}

async function login() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("E-mail"), "pessoa@exemplo.com");
  await user.type(screen.getByLabelText("Senha"), "segredo");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("papéis", () => {
  it("leva o nutricionista para / depois do login", async () => {
    mockBackend({ role: "NUTRITIONIST" });
    const router = renderApp("/login");
    await login();

    expect(await screen.findByRole("heading", { name: "Início do nutricionista" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/");
  });

  it("leva o admin para /admin depois do login", async () => {
    mockBackend({ role: "ADMIN" });
    const router = renderApp("/login");
    await login();

    expect(await screen.findByRole("heading", { name: "Área admin" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/admin");
  });

  it("redireciona o nutricionista que abre /admin para a própria área, sem erro", async () => {
    mockBackend({ role: "NUTRITIONIST", loggedIn: true });
    const router = renderApp("/admin");

    expect(await screen.findByRole("heading", { name: "Início do nutricionista" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/");
  });

  it("redireciona o admin que abre a área do nutricionista para /admin, sem erro", async () => {
    mockBackend({ role: "ADMIN", loggedIn: true });
    const router = renderApp("/perfil");

    expect(await screen.findByRole("heading", { name: "Área admin" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/admin");
  });
});

describe("primeiro acesso", () => {
  it("leva do login a definir senha, depois aos termos, depois à área do papel", async () => {
    const backend = mockBackend({ passwordChangeRequired: true, consented: false, role: "ADMIN" });
    const router = renderApp("/login");
    await login();

    expect(await screen.findByRole("heading", { name: "Definir senha" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/definir-senha");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nova senha"), "uma-senha-bem-longa");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "uma-senha-bem-longa");
    await user.click(screen.getByRole("button", { name: "Definir senha" }));

    expect(await screen.findByRole("heading", { name: "Antes de continuar" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/termos");
    expect(backend.passwordBodies).toEqual([{ newPassword: "uma-senha-bem-longa" }]);
  });

  it("depois de recarregar, 403 PASSWORD_CHANGE_REQUIRED leva a definir senha", async () => {
    const backend = mockBackend({ loggedIn: true });
    server.use(http.get("*/api/v1/me", () => apiError(403, "PASSWORD_CHANGE_REQUIRED")));
    const router = renderApp("/perfil");

    expect(await screen.findByRole("heading", { name: "Definir senha" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/definir-senha");
    expect(backend.passwordBodies).toEqual([]);
  });

  it("403 PASSWORD_CHANGE_REQUIRED em qualquer rota leva a definir senha", async () => {
    mockBackend({ loggedIn: true });
    server.use(http.put("*/api/v1/me", () => apiError(403, "PASSWORD_CHANGE_REQUIRED")));
    const router = renderApp("/perfil");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Salvar perfil" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/definir-senha"));
  });

  it("sem termos pendentes, vai direto para a área do papel", async () => {
    mockBackend({ passwordChangeRequired: true, role: "ADMIN" });
    const router = renderApp("/login");
    await login();
    await screen.findByRole("heading", { name: "Definir senha" });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nova senha"), "uma-senha-bem-longa");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "uma-senha-bem-longa");
    await user.click(screen.getByRole("button", { name: "Definir senha" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"));
  });

  it("segura quem ainda precisa definir a senha fora das outras rotas", async () => {
    mockBackend({ passwordChangeRequired: true });
    const router = renderApp("/login");
    await login();
    await screen.findByRole("heading", { name: "Definir senha" });

    await router.navigate("/perfil");

    await waitFor(() => expect(router.state.location.pathname).toBe("/definir-senha"));
  });

  it("mostra a regra de 12 a 72 caracteres como ajuda e valida antes de enviar", async () => {
    const backend = mockBackend({ passwordChangeRequired: true });
    renderApp("/login");
    await login();
    await screen.findByRole("heading", { name: "Definir senha" });
    expect(screen.getByText("Use de 12 a 72 caracteres.")).toBeVisible();
    expect(screen.queryByLabelText(/senha (temporária|atual)/i)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nova senha"), "curta");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "outra");
    await user.click(screen.getByRole("button", { name: "Definir senha" }));

    expect(screen.getByLabelText("Nova senha")).toHaveAccessibleDescription(
      "Use de 12 a 72 caracteres.",
    );
    expect(screen.getByText("A confirmação é diferente da nova senha.")).toBeVisible();
    expect(backend.passwordBodies).toEqual([]);
  });

  it("recusa senha com mais de 72 caracteres", async () => {
    mockBackend({ passwordChangeRequired: true });
    renderApp("/login");
    await login();
    await screen.findByRole("heading", { name: "Definir senha" });

    const user = userEvent.setup();
    const long = "a".repeat(73);
    await user.type(screen.getByLabelText("Nova senha"), long);
    await user.type(screen.getByLabelText("Confirmar nova senha"), long);
    await user.click(screen.getByRole("button", { name: "Definir senha" }));

    expect(screen.getByText("Use de 12 a 72 caracteres.", { selector: "p" })).toBeVisible();
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("alterar senha", () => {
  async function fill(current: string, next: string, confirmation = next) {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Senha atual"), current);
    await user.type(screen.getByLabelText("Nova senha"), next);
    await user.type(screen.getByLabelText("Confirmar nova senha"), confirmation);
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
  }

  it("troca a senha e avisa sobre os outros dispositivos", async () => {
    const backend = mockBackend({ loggedIn: true });
    renderApp("/perfil/senha");
    await fill("senha-atual-123", "nova-senha-segura");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Senha alterada. Outros dispositivos conectados serão desconectados em até 15 minutos.",
    );
    expect(backend.passwordBodies).toEqual([
      { currentPassword: "senha-atual-123", newPassword: "nova-senha-segura" },
    ]);
    expect(screen.getByLabelText("Senha atual")).toHaveValue("");
  });

  it("valida a confirmação sem chamar o servidor", async () => {
    const backend = mockBackend({ loggedIn: true });
    renderApp("/perfil/senha");
    await fill("senha-atual-123", "nova-senha-segura", "diferente-da-nova");

    expect(screen.getByText("A confirmação é diferente da nova senha.")).toBeVisible();
    expect(backend.passwordBodies).toEqual([]);
  });

  it("mostra erro no campo quando a senha atual está incorreta, sem perder a sessão", async () => {
    mockBackend({ loggedIn: true });
    let refreshes = 0;
    server.use(
      http.patch("*/api/v1/me/password", () => apiError(401, "AUTH_INVALID_CREDENTIALS")),
      http.post("*/api/v1/auth/refresh", () => {
        refreshes += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    const router = renderApp("/perfil/senha");
    await fill("errada-errada-1", "nova-senha-segura");

    expect(await screen.findByText("Senha atual incorreta.")).toBeVisible();
    expect(screen.getByLabelText("Senha atual")).toHaveAttribute("aria-invalid", "true");
    expect(router.state.location.pathname).toBe("/perfil/senha");
    expect(refreshes).toBe(0);
  });

  it("encerra a sessão quando a troca de senha recebe AUTHENTICATION_REQUIRED", async () => {
    mockBackend({ loggedIn: true });
    server.use(http.patch("*/api/v1/me/password", () => apiError(401, "AUTHENTICATION_REQUIRED")));
    const router = renderApp("/perfil/senha");
    await fill("senha-atual-123", "nova-senha-segura");

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });

  it("mostra o erro por campo devolvido pelo servidor", async () => {
    mockBackend({ loggedIn: true });
    server.use(
      http.patch("*/api/v1/me/password", () =>
        HttpResponse.json(
          {
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Inválido.",
            errors: [
              { field: "newPassword", code: "WEAK", message: "Escolha uma senha mais forte." },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    renderApp("/perfil/senha");
    await fill("senha-atual-123", "nova-senha-segura");

    expect(await screen.findByText("Escolha uma senha mais forte.")).toBeVisible();
  });

  it("avisa quando o servidor falha", async () => {
    mockBackend({ loggedIn: true });
    server.use(http.patch("*/api/v1/me/password", () => apiError(500, "INTERNAL_ERROR")));
    renderApp("/perfil/senha");
    await fill("senha-atual-123", "nova-senha-segura");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível alterar a senha agora. Tente de novo em instantes.",
    );
  });
});

describe("perfil do nutricionista", () => {
  it("mostra os dados atuais, com ajuda de privacidade e sem data de nascimento", async () => {
    mockBackend({ loggedIn: true });
    renderApp("/perfil");

    expect(await screen.findByLabelText("Nome")).toHaveValue("Marina Souza");
    expect(screen.getByLabelText("Telefone")).toHaveValue("11999990000");
    expect(screen.getByLabelText("Registro profissional")).toHaveValue("CRN-3 12345");
    expect(screen.getByLabelText("Bio")).toHaveValue("Nutrição esportiva.");
    expect(screen.getByLabelText("E-mail")).toBeDisabled();
    expect(screen.getAllByText("Por enquanto, só você vê estas informações.")).toHaveLength(2);
    expect(screen.queryByText(/nascimento/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/verificad/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar senha" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  it("salva as alterações preservando a data de nascimento já guardada", async () => {
    const backend = mockBackend({ loggedIn: true });
    renderApp("/perfil");
    const user = userEvent.setup();
    const phone = await screen.findByLabelText("Telefone");
    await user.clear(phone);
    await user.type(phone, "11888887777");
    await user.click(screen.getByRole("button", { name: "Salvar perfil" }));

    expect(await screen.findByText("Perfil salvo.")).toBeVisible();
    expect(backend.profileBodies).toEqual([
      {
        fullName: "Marina Souza",
        phone: "11888887777",
        registrationNumber: "CRN-3 12345",
        bio: "Nutrição esportiva.",
        birthDate: "1990-05-10",
      },
    ]);
  });

  it("exige o nome", async () => {
    const backend = mockBackend({ loggedIn: true });
    renderApp("/perfil");
    const user = userEvent.setup();
    await user.clear(await screen.findByLabelText("Nome"));
    await user.click(screen.getByRole("button", { name: "Salvar perfil" }));

    expect(screen.getByText("Informe seu nome.")).toBeVisible();
    expect(backend.profileBodies).toEqual([]);
  });

  it("avisa quando não consegue salvar", async () => {
    mockBackend({ loggedIn: true });
    server.use(http.put("*/api/v1/me", () => apiError(500, "INTERNAL_ERROR")));
    renderApp("/perfil");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Salvar perfil" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar agora. Tente de novo em instantes.",
    );
  });

  it("abre Alterar senha e encerra a sessão em Sair", async () => {
    mockBackend({ loggedIn: true });
    const router = renderApp("/perfil");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Alterar senha" }));
    expect(router.state.location.pathname).toBe("/perfil/senha");

    await router.navigate("/perfil");
    await user.click(await screen.findByRole("button", { name: "Sair" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });
});

describe("perfil do admin", () => {
  it("mostra nome, e-mail somente leitura, Alterar senha e Sair, sem os campos do nutricionista", async () => {
    mockBackend({ role: "ADMIN", loggedIn: true });
    const router = renderApp("/admin/perfil");

    expect(await screen.findByLabelText("Nome")).toHaveValue("Marina Souza");
    expect(screen.getByLabelText("E-mail")).toBeDisabled();
    expect(screen.queryByLabelText("Telefone")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Bio")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Registro profissional")).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(router.state.location.pathname).toBe("/admin/senha");
    const page = await screen.findByRole("region", { name: "Alterar senha" });
    expect(within(page).getByLabelText("Senha atual")).toBeVisible();
  });
});
