import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { client } from "../../shared/api";
import { server } from "../../test/server";
import {
  ConsentPage,
  LoginPage,
  RedirectIfSession,
  RequireConsent,
  RequireSession,
  SessionProvider,
  useLogout,
  useMe,
} from ".";

const session = { expiresIn: 900, passwordChangeRequired: false };
const unauthorized = () => new HttpResponse(null, { status: 401 });
const consentRequired = () =>
  HttpResponse.json(
    { status: 403, code: "CONSENT_REQUIRED", message: "Aceite os termos.", errors: [] },
    { status: 403 },
  );

function Connected() {
  const logout = useLogout();
  const me = useMe();
  return (
    <>
      <h1>Você está conectado</h1>
      <p>{me.data?.fullName}</p>
      <button onClick={() => logout.mutate()}>Sair</button>
    </>
  );
}

function renderApp(initialPath: string) {
  const router = createMemoryRouter(
    [
      { element: <RedirectIfSession />, children: [{ path: "/login", element: <LoginPage /> }] },
      { element: <RequireConsent />, children: [{ path: "/termos", element: <ConsentPage /> }] },
      { element: <RequireSession />, children: [{ path: "/", element: <Connected /> }] },
      {
        element: <RequireSession />,
        children: [{ path: "/pacientes", element: <p>Pacientes</p> }],
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

/** Simula o backend: `/me` só responde depois do login (ou já logado), como os cookies fariam. */
function mockBackend({ loggedIn = false, consented = true } = {}) {
  const state = { loggedIn, consented, accepted: [] as unknown[], logouts: 0 };
  server.use(
    http.get("*/api/v1/me", () => {
      if (!state.loggedIn) return unauthorized();
      if (!state.consented) return consentRequired();
      return HttpResponse.json({ fullName: "Marina" });
    }),
    http.post("*/api/v1/auth/refresh", unauthorized),
    http.post("*/api/v1/auth/login", () => {
      state.loggedIn = true;
      return HttpResponse.json(session);
    }),
    http.post("*/api/v1/auth/logout", () => {
      state.logouts += 1;
      state.loggedIn = false;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/api/v1/me/consents", () =>
      HttpResponse.json({
        upToDate: state.consented,
        documents: [
          { documentType: "TERMS_OF_USE", currentVersion: "v1", accepted: false },
          { documentType: "PRIVACY_POLICY", currentVersion: "v3", accepted: false },
        ],
      }),
    ),
    http.post("*/api/v1/me/consents", async ({ request }) => {
      state.accepted.push(await request.json());
      if (state.accepted.length === 2) state.consented = true;
      return HttpResponse.json({ upToDate: state.consented, documents: [] });
    }),
  );
  return state;
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("E-mail"), email);
  await user.type(screen.getByLabelText("Senha"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("login", () => {
  it("inicia a sessão pelos cookies e mostra a tela conectada", async () => {
    mockBackend();
    renderApp("/login");
    await fillAndSubmit("nutri@exemplo.com", "segredo");

    expect(await screen.findByRole("heading", { name: "Você está conectado" })).toBeInTheDocument();
    expect(await screen.findByText("Marina")).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it("volta ao endereço pedido depois de entrar", async () => {
    mockBackend();
    const router = renderApp("/pacientes");
    await fillAndSubmit("nutri@exemplo.com", "segredo");

    expect(await screen.findByText("Pacientes")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/pacientes");
  });

  it("avisa sobre credenciais inválidas", async () => {
    mockBackend();
    server.use(
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json(
          {
            status: 401,
            code: "AUTH_INVALID_CREDENTIALS",
            message: "E-mail ou senha inválidos.",
            errors: [],
          },
          { status: 401 },
        ),
      ),
    );
    renderApp("/login");
    await fillAndSubmit("nutri@exemplo.com", "errada");

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos");
  });

  it("avisa quando há tentativas demais", async () => {
    mockBackend();
    server.use(
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json(
          { status: 429, code: "LOGIN_RATE_LIMITED", message: "Muitas tentativas.", errors: [] },
          { status: 429 },
        ),
      ),
    );
    renderApp("/login");
    await fillAndSubmit("nutri@exemplo.com", "segredo");

    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas");
  });

  it("mostra o erro de cada campo quando a validação falha", async () => {
    mockBackend();
    server.use(
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json(
          {
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Existem campos inválidos na requisição.",
            errors: [
              { field: "email", code: "INVALID_EMAIL", message: "Informe um e-mail válido." },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    renderApp("/login");
    await fillAndSubmit("invalido", "x");

    expect(await screen.findByText("Informe um e-mail válido.")).toBeInTheDocument();
  });

  it("avisa quando o servidor não responde", async () => {
    mockBackend();
    server.use(http.post("*/api/v1/auth/login", () => HttpResponse.error()));
    renderApp("/login");
    await fillAndSubmit("nutri@exemplo.com", "segredo");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível falar com o servidor",
    );
  });
});

describe("sessão", () => {
  it("restaura a sessão dos cookies ao abrir o portal", async () => {
    mockBackend({ loggedIn: true });
    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Você está conectado" })).toBeInTheDocument();
  });

  it("vai ao login sem sessão, guardando o destino", async () => {
    mockBackend();
    const router = renderApp("/pacientes");

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.state).toEqual({ from: "/pacientes" });
  });

  it("Sair revoga a sessão, limpa o cache e volta ao login", async () => {
    const backend = mockBackend({ loggedIn: true });
    const router = renderApp("/");

    await userEvent.setup().click(await screen.findByRole("button", { name: "Sair" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(backend.logouts).toBe(1);
  });

  it("Sair encerra a sessão local mesmo se a API falhar", async () => {
    mockBackend({ loggedIn: true });
    server.use(http.post("*/api/v1/auth/logout", () => HttpResponse.error()));
    const router = renderApp("/");

    await userEvent.setup().click(await screen.findByRole("button", { name: "Sair" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });
});

describe("termos", () => {
  it("leva aos termos quando o aceite está pendente e libera o portal depois do aceite", async () => {
    const backend = mockBackend({ loggedIn: true, consented: false });
    const router = renderApp("/");

    expect(await screen.findByRole("heading", { name: "Antes de continuar" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/termos");
    expect(await screen.findByRole("region", { name: "Termos de uso" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Política de privacidade" })).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Li e aceito os documentos" }));

    expect(await screen.findByRole("heading", { name: "Você está conectado" })).toBeInTheDocument();
    expect(backend.accepted).toEqual([
      { documentType: "TERMS_OF_USE", version: "v1" },
      { documentType: "PRIVACY_POLICY", version: "v3" },
    ]);
  });

  it("depois do login, termos pendentes levam à tela de aceite", async () => {
    mockBackend({ consented: false });
    const router = renderApp("/login");
    await fillAndSubmit("nutri@exemplo.com", "segredo");

    expect(await screen.findByRole("heading", { name: "Antes de continuar" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/termos");
  });

  it("não deixa quem já aceitou ficar na tela de termos", async () => {
    mockBackend({ loggedIn: true });
    const router = renderApp("/termos");

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });
});

describe("cliente HTTP", () => {
  it("envia cookies e a versão do cliente, sem Authorization", async () => {
    server.use(http.get("*/api/v1/me", () => HttpResponse.json({ fullName: "Marina" })));
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await client.GET("/api/v1/me");

    const sent = fetchSpy.mock.calls[0][0] as Request;
    expect(sent.credentials).toBe("include");
    expect(sent.headers.get("X-Client-Version")).toMatch(/^web\/\d/);
    expect(sent.headers.get("Authorization")).toBeNull();
    fetchSpy.mockRestore();
  });

  it("renova a sessão em 401 uma única vez para pedidos simultâneos e os repete", async () => {
    let refreshed = false;
    let refreshes = 0;
    server.use(
      http.get("*/api/v1/me", () =>
        refreshed ? HttpResponse.json({ fullName: "Marina" }) : unauthorized(),
      ),
      http.get("*/api/v1/me/consents", () =>
        refreshed ? HttpResponse.json({ upToDate: true, documents: [] }) : unauthorized(),
      ),
      http.post("*/api/v1/auth/refresh", async () => {
        refreshes += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        refreshed = true;
        return HttpResponse.json(session);
      }),
    );

    const [me, consents] = await Promise.all([
      client.GET("/api/v1/me"),
      client.GET("/api/v1/me/consents"),
    ]);

    expect(me.data?.fullName).toBe("Marina");
    expect(consents.data?.upToDate).toBe(true);
    expect(refreshes).toBe(1);
  });

  it("repete o pedido mesmo se a renovação falhar (outra aba pode ter renovado)", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/v1/me", () =>
        ++calls === 1 ? unauthorized() : HttpResponse.json({ fullName: "Marina" }),
      ),
      http.post("*/api/v1/auth/refresh", unauthorized),
    );

    const { data } = await client.GET("/api/v1/me");

    expect(data?.fullName).toBe("Marina");
    expect(calls).toBe(2);
  });

  it("volta ao login quando a renovação falha e a sessão não vale mais", async () => {
    let loggedIn = true;
    server.use(
      http.get("*/api/v1/me", () =>
        loggedIn ? HttpResponse.json({ fullName: "Marina" }) : unauthorized(),
      ),
      http.get("*/api/v1/me/consents", unauthorized),
      http.post("*/api/v1/auth/refresh", unauthorized),
    );
    const router = renderApp("/");
    await screen.findByRole("heading", { name: "Você está conectado" });

    loggedIn = false;
    await client.GET("/api/v1/me/consents").catch(() => undefined);

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });
});
