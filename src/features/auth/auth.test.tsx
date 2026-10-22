import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import type { components } from "../../shared/api";
import { server } from "../../test/server";
import { LoginPage, RedirectIfSession, RequireSession, SessionProvider, useLogout, useMe } from ".";
import { readSession, writeSession } from "./session-storage";

type AuthenticationResponse = components["schemas"]["AuthenticationResponse"];

const tokens: AuthenticationResponse = {
  accessToken: "access-1",
  refreshToken: "refresh-1",
  tokenType: "Bearer",
  expiresIn: 900,
  passwordChangeRequired: false,
};

function Connected() {
  const logout = useLogout();
  return (
    <>
      <h1>Você está conectado</h1>
      <button onClick={() => logout.mutate()}>Sair</button>
    </>
  );
}

function renderApp(initialPath: string) {
  const router = createMemoryRouter(
    [
      { element: <RedirectIfSession />, children: [{ path: "/login", element: <LoginPage /> }] },
      { element: <RequireSession />, children: [{ path: "/", element: <Connected /> }] },
    ],
    { initialEntries: [initialPath] },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return router;
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("E-mail"), email);
  await user.type(screen.getByLabelText("Senha"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("login", () => {
  beforeEach(() => localStorage.clear());

  it("guarda os tokens e mostra a tela conectada", async () => {
    server.use(http.post("*/api/v1/auth/login", () => HttpResponse.json(tokens)));
    renderApp("/login");
    await fillAndSubmit("nutri@exemplo.com", "segredo");

    expect(await screen.findByRole("heading", { name: "Você está conectado" })).toBeInTheDocument();
    expect(readSession()).toEqual({ accessToken: "access-1", refreshToken: "refresh-1" });
  });

  it("avisa sobre credenciais inválidas sem guardar sessão", async () => {
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
    expect(readSession()).toBeNull();
  });

  it("mostra o erro de cada campo quando a validação falha", async () => {
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
    server.use(http.post("*/api/v1/auth/login", () => HttpResponse.error()));
    renderApp("/login");
    await fillAndSubmit("nutri@exemplo.com", "segredo");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível falar com o servidor",
    );
  });
});

describe("sessão", () => {
  it("restaura a sessão do localStorage", () => {
    writeSession({ accessToken: "a", refreshToken: "r" });
    renderApp("/");

    expect(screen.getByRole("heading", { name: "Você está conectado" })).toBeInTheDocument();
  });

  it("redireciona para o login sem sessão", () => {
    const router = renderApp("/");

    expect(router.state.location.pathname).toBe("/login");
  });

  it("Sair revoga o refresh token, limpa a sessão e volta ao login", async () => {
    let revoked: unknown;
    server.use(
      http.post("*/api/v1/auth/logout", async ({ request }) => {
        revoked = await request.json();
        return new HttpResponse(null, { status: 200 });
      }),
    );
    writeSession({ accessToken: "a", refreshToken: "r" });
    const router = renderApp("/");

    await userEvent.setup().click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(revoked).toEqual({ refreshToken: "r" });
    expect(readSession()).toBeNull();
  });

  it("Sair encerra a sessão local mesmo se a API falhar", async () => {
    server.use(http.post("*/api/v1/auth/logout", () => HttpResponse.error()));
    writeSession({ accessToken: "a", refreshToken: "r" });
    const router = renderApp("/");

    await userEvent.setup().click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(readSession()).toBeNull();
  });
});

describe("token nas requisições", () => {
  function Probe() {
    const me = useMe();
    return <p>{me.data?.fullName ?? (me.isError ? "erro" : "carregando")}</p>;
  }

  function renderProbe() {
    const router = createMemoryRouter(
      [
        { element: <RedirectIfSession />, children: [{ path: "/login", element: <LoginPage /> }] },
        { element: <RequireSession />, children: [{ path: "/", element: <Probe /> }] },
      ],
      { initialEntries: ["/"] },
    );
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>,
    );
    return router;
  }

  it("envia o access token", async () => {
    let header: string | null = null;
    server.use(
      http.get("*/api/v1/me", ({ request }) => {
        header = request.headers.get("Authorization");
        return HttpResponse.json({ fullName: "Marina" });
      }),
    );
    writeSession({ accessToken: "a1", refreshToken: "r1" });
    renderProbe();

    expect(await screen.findByText("Marina")).toBeInTheDocument();
    expect(header).toBe("Bearer a1");
  });

  it("renova o token em 401, repete o pedido e guarda a nova sessão", async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get("*/api/v1/me", ({ request }) => {
        const auth = request.headers.get("Authorization");
        seen.push(auth);
        return auth === "Bearer a2"
          ? HttpResponse.json({ fullName: "Marina" })
          : new HttpResponse(null, { status: 401 });
      }),
      http.post("*/api/v1/auth/refresh", async ({ request }) => {
        expect(await request.json()).toEqual({ refreshToken: "r1" });
        return HttpResponse.json({ ...tokens, accessToken: "a2", refreshToken: "r2" });
      }),
    );
    writeSession({ accessToken: "a1", refreshToken: "r1" });
    renderProbe();

    expect(await screen.findByText("Marina")).toBeInTheDocument();
    expect(seen).toEqual(["Bearer a1", "Bearer a2"]);
    expect(readSession()).toEqual({ accessToken: "a2", refreshToken: "r2" });
  });

  it("volta ao login quando a renovação falha", async () => {
    server.use(
      http.get("*/api/v1/me", () => new HttpResponse(null, { status: 401 })),
      http.post("*/api/v1/auth/refresh", () => new HttpResponse(null, { status: 401 })),
    );
    writeSession({ accessToken: "a1", refreshToken: "r1" });
    const router = renderProbe();

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(readSession()).toBeNull();
  });
});
