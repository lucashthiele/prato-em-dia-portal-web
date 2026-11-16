import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import type { components } from "../../shared/api";
import { SessionProvider } from "../auth";
import { server } from "../../test/server";

export type AdminUser = components["schemas"]["AdminUserResponse"];

export function user(n: number, patch: Partial<AdminUser> = {}): AdminUser {
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    email: `u${n}@exemplo.com`,
    fullName: `Usuário ${n}`,
    role: "NUTRITIONIST",
    status: "ACTIVE",
    passwordChangeRequired: true,
    createdAt: `2026-10-0${n}T10:00:00Z`,
    ...patch,
  };
}

export const ADMIN_ID = "00000000-0000-4000-8000-0000000000aa";

/** O admin logado (o Shell e o detalhe leem `/me`). */
export function mockMe() {
  server.use(
    http.get("*/api/v1/me", () =>
      HttpResponse.json({ fullName: "Admin", userAccountId: ADMIN_ID }),
    ),
  );
}

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

export function renderRoutes(
  routes: { path: string; element: ReactNode }[],
  url: string,
  options: { withSession?: boolean } = {},
) {
  const router = createMemoryRouter(
    routes.map((route) => ({
      path: route.path,
      element: (
        <>
          {route.element}
          <Where />
        </>
      ),
    })),
    { initialEntries: [url] },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {options.withSession ? (
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      ) : (
        <RouterProvider router={router} />
      )}
    </QueryClientProvider>,
  );
  return router;
}
