import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Navigate } from "react-router";
import { describe, expect, it } from "vitest";
import { server } from "../../test/server";
import { AdminShell } from ".";
import { renderRoutes } from "./test-utils";

function renderShell(url: string) {
  server.use(http.get("*/api/v1/me", () => HttpResponse.json({ fullName: "Admin Geral" })));
  renderRoutes(
    [
      { path: "/admin", element: <Navigate to="/admin/usuarios" replace /> },
      { path: "/admin/*", element: <AdminShell /> },
    ],
    url,
    { withSession: true },
  );
}

describe("shell da administração", () => {
  it("tem só Usuários, Auditoria e Perfil e conta", async () => {
    renderShell("/admin/auditoria");
    const nav = await screen.findByRole("navigation", { name: "Principal" });
    expect(nav.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Usuários" })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
    expect(screen.getByRole("link", { name: "Auditoria" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Perfil e conta" })).toHaveAttribute(
      "href",
      "/admin/perfil",
    );
    expect(screen.queryByRole("link", { name: "Pacientes" })).not.toBeInTheDocument();
  });

  it("marca Usuários como área padrão", async () => {
    renderShell("/admin/usuarios/x");
    expect(await screen.findByRole("link", { name: "Usuários" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
