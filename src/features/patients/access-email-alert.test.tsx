import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/server";
import { PatientPage } from ".";

afterEach(() => vi.useRealTimers());

function mockApi(statuses: string[]) {
  let gets = 0;
  const calls: string[] = [];
  server.use(
    http.get("*/api/v1/nutritionists/me/patients/:id", () => {
      const status = statuses[Math.min(gets, statuses.length - 1)];
      gets += 1;
      return HttpResponse.json({
        patientId: "p1",
        patientFullName: "Ana Ribeiro",
        patientEmail: "ana@exemplo.com",
        relationshipStatus: "ACTIVE",
        emailDeliveryStatus: status,
      });
    }),
    http.get("*/api/v1/nutritionists/me/patients/:id/prescriptions", () => HttpResponse.json([])),
    http.post("*/api/v1/nutritionists/me/patients/:id/access-email", () => {
      calls.push("resend");
      // Depois do reenvio o servidor volta o envio para pendente.
      statuses.splice(0, statuses.length, "PENDING", "SENT");
      gets = 0;
      return new HttpResponse(null, { status: 202 });
    }),
  );
  return { calls, gets: () => gets };
}

function renderPage(fromCreate = true) {
  const router = createMemoryRouter([{ path: "/pacientes/:patientId", element: <PatientPage /> }], {
    initialEntries: [
      { pathname: "/pacientes/p1", state: fromCreate ? { accessEmailAlert: true } : null },
    ],
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("Alert do e-mail de acesso", () => {
  it("mostra sucesso quando o envio foi concluído", async () => {
    mockApi(["SENT"]);
    renderPage();
    expect(await screen.findByText("E-mail de acesso enviado para ana@exemplo.com.")).toBeVisible();
  });

  it("não aparece fora do cadastro", async () => {
    mockApi(["SENT"]);
    renderPage(false);
    await screen.findByRole("heading", { level: 1, name: "Ana Ribeiro" });
    expect(screen.queryByText(/E-mail de acesso enviado/)).toBeNull();
  });

  it("consulta de novo enquanto está pendente e passa para enviado", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const api = mockApi(["PENDING", "PENDING", "SENT"]);
    renderPage();

    expect(
      await screen.findByText("Estamos enviando o e-mail de acesso para ana@exemplo.com."),
    ).toBeVisible();
    await advance(3_100);
    await advance(3_100);
    expect(await screen.findByText("E-mail de acesso enviado para ana@exemplo.com.")).toBeVisible();
    expect(api.gets()).toBe(3);
  });

  it("para de consultar depois de cerca de 30 s e avisa que está demorando", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const api = mockApi(["PENDING"]);
    renderPage();
    await screen.findByText("Estamos enviando o e-mail de acesso para ana@exemplo.com.");

    await advance(31_000);
    expect(await screen.findByText(/está demorando mais que o esperado/)).toBeVisible();
    const total = api.gets();
    expect(total).toBeGreaterThan(5);
    await advance(10_000);
    expect(api.gets()).toBe(total);
  });

  it("em falha, avisa e reenvia o e-mail, voltando a consultar", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const api = mockApi(["FAILED"]);
    renderPage();

    expect(await screen.findByText("Não foi possível enviar o e-mail de acesso")).toBeVisible();
    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(screen.getByRole("button", { name: "Reenviar e-mail" }));
    expect(api.calls).toEqual(["resend"]);
    expect(await screen.findByText(/Estamos enviando o e-mail de acesso/)).toBeVisible();
    await advance(3_100);
    expect(await screen.findByText("E-mail de acesso enviado para ana@exemplo.com.")).toBeVisible();
  });
});
