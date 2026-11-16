import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { components } from "../../shared/api";
import { server } from "../../test/server";
import { PatientPage } from "../patients";

type Category = components["schemas"]["MealCategory"];
type Execution = components["schemas"]["Execution"];

const PATIENT = "p1";
const TYPES = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"] as const;

// Quarta-feira 18/11/2026: a semana atual vai de 16/11 a 22/11.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));
});
afterEach(() => vi.useRealTimers());

function planned(
  type: (typeof TYPES)[number],
  state: Category["state"],
  extra: Partial<Category> = {},
): Category {
  return { mealType: type, state, plannedMealId: `pm-${type}`, ...extra };
}

function unplanned(type: (typeof TYPES)[number]): Category {
  return { mealType: type, state: "NOT_LOGGED" };
}

/** Semana de 16/11: segunda registrada, terça sem registro (com categorias sem refeição), resto futuro. */
const WEEK: Record<string, Category[]> = {
  "2026-11-16": [
    planned("BREAKFAST", "LOGGED"),
    planned("LUNCH", "LOGGED"),
    planned("SNACK", "PARTIAL"),
    planned("DINNER", "NOT_LOGGED"),
  ],
  "2026-11-17": [
    planned("BREAKFAST", "NOT_LOGGED"),
    planned("LUNCH", "NOT_LOGGED"),
    unplanned("SNACK"),
    unplanned("DINNER"),
  ],
  "2026-11-18": TYPES.map((type) => planned(type, "NOT_LOGGED")),
};
// Dias futuros: previsto, mas ainda sem registro; não podem entrar nas contagens.
for (const date of ["2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]) {
  WEEK[date] = TYPES.map((type) => planned(type, "NOT_LOGGED"));
}

const EXECUTIONS: Execution[] = [
  {
    id: "e1",
    date: "2026-11-16",
    mealType: "LUNCH",
    items: [{ id: "ei1", foodId: "f2", quantity: 50, unit: "g", allowedSubstitutionId: "s1" }],
  },
];

const prescriptions = [
  {
    id: "rx1",
    patientId: PATIENT,
    planningMode: "SUBSTITUTIONS_ONLY",
    status: "ACTIVE",
    versions: [
      { id: "v1", number: 1, status: "ARCHIVED", createdAt: "2026-10-01T10:00:00Z", meals: [] },
      {
        id: "v2",
        number: 2,
        status: "PUBLISHED",
        createdAt: "2026-11-10T10:00:00Z",
        publishedAt: "2026-11-10T10:00:00Z",
        nutritionTargets: [
          { nutrientCode: "energy_kcal", amount: 1800, unit: "kcal" },
          { nutrientCode: "protein", amount: 90, unit: "g" },
        ],
        meals: [],
      },
    ],
  },
];

interface Options {
  week?: Record<string, Category[]>;
  categoriesStatus?: number;
  badDate?: string;
  ended?: boolean;
}

function mockApi({ week = WEEK, categoriesStatus, badDate, ended }: Options = {}) {
  const calls = { categories: [] as string[], executions: [] as string[], calendar: 0 };
  server.use(
    http.get("*/api/v1/nutritionists/me/patients/:id", () =>
      HttpResponse.json({
        relationshipId: "r1",
        patientId: PATIENT,
        patientFullName: "Ana Ribeiro",
        patientEmail: "ana@exemplo.com",
        relationshipStatus: ended ? "ENDED" : "ACTIVE",
        emailDeliveryStatus: "SENT",
        createdAt: "2026-10-01T10:00:00Z",
      }),
    ),
    http.get("*/api/v1/nutritionists/me/patients/:id/prescriptions", () =>
      HttpResponse.json(prescriptions),
    ),
    http.get("*/api/v1/nutritionists/me/patients/:id/daily-meal-categories", ({ request }) => {
      const date = new URL(request.url).searchParams.get("date") ?? "";
      calls.categories.push(date);
      if (categoriesStatus) return new HttpResponse(null, { status: categoriesStatus });
      if (date === badDate) return new HttpResponse(null, { status: 400 });
      return HttpResponse.json({ date, categories: week[date] ?? TYPES.map(unplanned) });
    }),
    http.get("*/api/v1/nutritionists/me/patients/:id/meal-executions", ({ request }) => {
      const url = new URL(request.url);
      const from = url.searchParams.get("from") ?? "";
      const to = url.searchParams.get("to") ?? "";
      calls.executions.push(`${from}..${to}`);
      return HttpResponse.json(EXECUTIONS.filter((e) => e.date! >= from && e.date! <= to));
    }),
    http.get("*/api/v1/nutritionists/me/patients/:id/calendar-periods", () => {
      calls.calendar += 1;
      return HttpResponse.json({
        prescriptions: [
          { versionId: "v1", start: "2026-11-02", end: "2026-11-16" },
          { versionId: "v2", start: "2026-11-17", end: "2026-11-30" },
        ],
      });
    }),
  );
  return calls;
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      { path: "/pacientes/:patientId", element: <PatientPage /> },
      { path: "/pacientes/:patientId/acompanhamento/:data", element: <PatientPage /> },
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

const WEEK_URL = `/pacientes/${PATIENT}?aba=acompanhamento`;

function row(name: RegExp) {
  return screen.getByRole("row", { name });
}

function count(label: string): string {
  const summary = screen.getByRole("region", { name: /^Semana de / });
  const card = within(summary).getByText(label).closest("li");
  return card!.lastElementChild!.textContent ?? "";
}

describe("Acompanhamento da semana", () => {
  it("abre na semana atual, de segunda a domingo, com PatientHeader no topo", async () => {
    const calls = mockApi();
    renderAt(WEEK_URL);
    expect(await screen.findByRole("heading", { level: 1, name: "Ana Ribeiro" })).toBeVisible();
    expect(await screen.findByText("16/11/2026 a 22/11/2026")).toBeVisible();
    expect(calls.categories.sort()).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
  });

  it("faz 7 chamadas de categorias, 1 de execuções e 1 de calendário por semana", async () => {
    const calls = mockApi();
    renderAt(WEEK_URL);
    await screen.findByText("Previstas");
    expect(calls.categories).toHaveLength(7);
    expect(calls.executions).toEqual(["2026-11-16..2026-11-22"]);
    expect(calls.calendar).toBe(1);

    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(screen.getByRole("button", { name: "Próxima semana" }));
    await screen.findByText("23/11/2026 a 29/11/2026");
    await vi.waitFor(() => expect(calls.categories).toHaveLength(14));
    // O calendário fica em cache entre as semanas.
    expect(calls.calendar).toBe(1);
    expect(calls.executions).toEqual(["2026-11-16..2026-11-22", "2026-11-23..2026-11-29"]);
  });

  it("navega entre semanas e volta para a semana atual", async () => {
    mockApi();
    renderAt(WEEK_URL);
    await screen.findByText("16/11/2026 a 22/11/2026");
    expect(screen.queryByRole("button", { name: "Semana atual" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(await screen.findByText("09/11/2026 a 15/11/2026")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    await userEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    expect(await screen.findByText("23/11/2026 a 29/11/2026")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Semana atual" }));
    expect(await screen.findByText("16/11/2026 a 22/11/2026")).toBeVisible();
  });

  it("abre a semana indicada na URL, mesmo se a data cair no meio da semana", async () => {
    mockApi();
    renderAt(`${WEEK_URL}&semana=2026-11-11`);
    expect(await screen.findByText("09/11/2026 a 15/11/2026")).toBeVisible();
  });

  it("conta as categorias sem dias futuros e sem percentual", async () => {
    mockApi();
    renderAt(WEEK_URL);
    await screen.findByText("Previstas");
    // Segunda 4 + terça 2 + quarta (hoje) 4 previstas; os 4 dias futuros ficam de fora.
    expect(count("Previstas")).toBe("10");
    expect(count("Registradas")).toBe("2");
    expect(count("Parciais")).toBe("1");
    // Sem registro conta só categorias previstas: segunda 1 + terça 2 + hoje 4.
    expect(count("Sem registro")).toBe("7");
    expect(count("Com substituição")).toBe("1");
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("diferencia '—' (sem refeição planejada) de 'Sem registro' e marca a substituição", async () => {
    mockApi();
    renderAt(WEEK_URL);
    await screen.findByText("Previstas");

    const tuesday = within(row(/Terça-feira, 17\/11/));
    expect(tuesday.getAllByText("Sem registro")).toHaveLength(2);
    expect(tuesday.getAllByText("—")).toHaveLength(2);

    const monday = within(row(/Segunda-feira, 16\/11/));
    expect(monday.getAllByText("Registrada")).toHaveLength(2);
    expect(monday.getByText("Parcial")).toBeVisible();
    expect(monday.getAllByText("Com substituição")).toHaveLength(1);

    // Dia futuro: sem chip de estado, só o que está previsto.
    const friday = within(row(/Sexta-feira, 20\/11/));
    expect(friday.queryByText("Sem registro")).toBeNull();
    expect(friday.getAllByText("Prevista")).toHaveLength(4);
  });

  it("marca o dia em que a versão troca", async () => {
    mockApi();
    renderAt(WEEK_URL);
    await screen.findByText("Previstas");
    expect(screen.getAllByText("Versão 2 a partir daqui")).toHaveLength(1);
    expect(within(row(/Terça-feira, 17\/11/)).getByText("Versão 2 a partir daqui")).toBeVisible();
  });

  it("mostra uma data com registro livre fora de plano na grade", async () => {
    mockApi({
      week: {
        "2026-11-17": [{ mealType: "SNACK", state: "LOGGED" }, ...TYPES.slice(0, 1).map(unplanned)],
      },
    });
    renderAt(WEEK_URL);
    await screen.findByText("Previstas");
    expect(within(row(/Terça-feira, 17\/11/)).getByText("Registrada")).toBeVisible();
    // Sem plano: não é "prevista".
    expect(count("Previstas")).toBe("0");
    expect(count("Registradas")).toBe("1");
  });

  it("usa um estado vazio quando a semana não tem plano nem registro", async () => {
    mockApi({ week: {} });
    renderAt(WEEK_URL);
    expect(await screen.findByText("Sem plano nesta semana")).toBeVisible();
    expect(screen.queryByText("Previstas")).toBeNull();
  });

  it("trata a data recusada pelo servidor como dia sem refeição, não como falha", async () => {
    mockApi({ badDate: "2026-11-21" });
    renderAt(WEEK_URL);
    await screen.findByText("Previstas");
    expect(within(row(/Sábado, 21\/11/)).getAllByText("—")).toHaveLength(4);
  });

  it("mostra o erro com ação de repetir quando o servidor falha", async () => {
    mockApi({ categoriesStatus: 500 });
    renderAt(WEEK_URL);
    expect(await screen.findByText("Não foi possível carregar o acompanhamento")).toBeVisible();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Semana anterior" })).toBeVisible();
  });

  it("não mostra a semana de um vínculo encerrado", async () => {
    mockApi({ ended: true });
    renderAt(WEEK_URL);
    expect(await screen.findByText(/não acessa mais o acompanhamento/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Semana anterior" })).toBeNull();
  });
});

describe("Detalhe do dia", () => {
  function mockDay(summaryStatus?: number) {
    server.use(
      http.get("*/api/v1/foods/:id", ({ params }) =>
        HttpResponse.json({
          id: params.id,
          name: { f1: "Ovo cozido", f2: "Queijo minas", f3: "Pão integral" }[params.id as string],
        }),
      ),
      http.get("*/api/v1/nutritionists/me/patients/:id/daily-nutrition-summary", () =>
        summaryStatus
          ? new HttpResponse(null, { status: summaryStatus })
          : HttpResponse.json({
              date: "2026-11-16",
              planId: "plan1",
              prescriptionVersionId: "v2",
              planned: {
                energy_kcal: { amount: 1650, unit: "kcal" },
                protein: { amount: 85.5, unit: "g" },
                carbohydrate: { amount: 200, unit: "g" },
              },
              realized: {
                energy_kcal: { amount: 1200, unit: "kcal" },
                protein: { amount: 60, unit: "g" },
              },
            }),
      ),
      http.get("*/api/v1/nutritionists/me/patients/:id/weekly-plans/:planId", () =>
        HttpResponse.json({
          id: "plan1",
          meals: [
            {
              id: "pm1",
              date: "2026-11-16",
              mealType: "BREAKFAST",
              items: [{ id: "pi1", foodId: "f1", quantity: 2, unit: "unidade", order: 1 }],
            },
            {
              id: "pm2",
              date: "2026-11-16",
              mealType: "LUNCH",
              items: [{ id: "pi2", foodId: "f3", quantity: 2, unit: "fatia", order: 1 }],
            },
            {
              id: "pm3",
              date: "2026-11-17",
              mealType: "LUNCH",
              items: [{ id: "pi3", foodId: "f1", quantity: 1, unit: "unidade", order: 1 }],
            },
          ],
        }),
      ),
    );
  }

  const DAY_URL = `/pacientes/${PATIENT}/acompanhamento/2026-11-16`;

  it("mostra por categoria o planejado, o registrado e a marca de substituição", async () => {
    mockApi();
    mockDay();
    renderAt(DAY_URL);

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Ribeiro" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Segunda-feira, 16/11/2026" })).toBeVisible();

    const lunch = within(await screen.findByRole("region", { name: "Almoço" }));
    expect(await lunch.findByText("Pão integral")).toBeVisible();
    expect(await lunch.findByText("Queijo minas")).toBeVisible();
    // O planejado do dia 17 não aparece no dia 16.
    expect(
      within(screen.getByRole("region", { name: "Café da manhã" })).getByText("Ovo cozido"),
    ).toBeVisible();
    expect(screen.getAllByText("Ovo cozido")).toHaveLength(1);
    expect(lunch.getByText("Registrada")).toBeVisible();
    // A marca fica no cabeçalho da categoria e no item registrado.
    expect(lunch.getAllByText("Com substituição")).toHaveLength(2);
    expect(lunch.getByText(/2 fatias/)).toBeVisible();
    expect(lunch.getByText(/50 g/)).toBeVisible();

    const snack = within(screen.getByRole("region", { name: "Lanche" }));
    expect(snack.getByText("Parcial")).toBeVisible();
    expect(snack.getAllByText("Nada registrado.")).toHaveLength(1);
    expect(snack.getByText("Nada planejado.")).toBeVisible();
  });

  it("compara o resumo nutricional do dia com as metas diárias", async () => {
    mockApi();
    mockDay();
    renderAt(DAY_URL);

    const section = within(
      await screen.findByRole("region", { name: "Resumo nutricional do dia" }),
    );
    const energy = await section.findByRole("row", { name: /Energia/ });
    expect(energy).toHaveTextContent("1.800 kcal");
    expect(energy).toHaveTextContent("1.650 kcal");
    expect(energy).toHaveTextContent("1.200 kcal");
    expect(section.getByRole("row", { name: /Proteína/ })).toHaveTextContent("90 g");
    expect(section.getByRole("row", { name: /Proteína/ })).toHaveTextContent("85,5 g");
    // Sem meta definida na versão.
    expect(section.getByRole("row", { name: /Carboidrato/ })).toHaveTextContent("Sem meta");
  });

  it("volta para a semana do dia aberto", async () => {
    mockApi();
    mockDay();
    const router = renderAt(DAY_URL);
    await userEvent.click(await screen.findByRole("link", { name: "Voltar para a semana" }));
    expect(router.state.location.pathname).toBe(`/pacientes/${PATIENT}`);
    expect(router.state.location.search).toBe("?aba=acompanhamento&semana=2026-11-16");
  });

  it("abre o detalhe pelo dia da grade", async () => {
    mockApi();
    mockDay();
    const router = renderAt(WEEK_URL);
    await userEvent.click(await screen.findByRole("link", { name: /Segunda-feira, 16\/11/ }));
    expect(router.state.location.pathname).toBe(DAY_URL);
    expect(await screen.findByRole("heading", { name: "Segunda-feira, 16/11/2026" })).toBeVisible();
  });

  it("segue sem o resumo quando o dia não tem plano", async () => {
    mockApi();
    mockDay(404);
    renderAt(DAY_URL);
    expect(await screen.findByText("Não há resumo nutricional para este dia.")).toBeVisible();
    expect(screen.getByRole("region", { name: "Almoço" })).toBeVisible();
  });

  it("recusa uma data inválida", async () => {
    mockApi();
    renderAt(`/pacientes/${PATIENT}/acompanhamento/2026-02-30`);
    expect(await screen.findByText("Data inválida")).toBeVisible();
  });
});
