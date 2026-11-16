import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { components } from "../../shared/api";
import { server } from "../../test/server";
import { PrescriptionEditorPage, PrescriptionPanel } from ".";
import {
  entryFromSaved,
  toRequest,
  emptyDraft,
  newEntry,
  toPortionRefs,
  entryQuantity,
} from "./lib/editor-model";

type Prescription = components["schemas"]["PrescriptionOutput"];
type Version = components["schemas"]["VersionOutput"];
type Calendar = components["schemas"]["Calendar"];

const PATIENT = "p1";

const PORTIONS = [
  { id: "p100", foodId: "f1", label: "100 g", quantity: 100, unit: "g", active: true },
  { id: "pu", foodId: "f1", label: "1 unidade", quantity: 1, unit: "unidade", active: true },
];

const draftVersion = (overrides: Partial<Version> = {}): Version => ({
  id: "v1",
  number: 1,
  status: "DRAFT",
  createdAt: "2026-11-10T10:00:00Z",
  meals: [],
  ...overrides,
});

const breakfast = (substitutions: object[] = []): Version["meals"] => [
  {
    id: "m1",
    name: "Café da manhã",
    mealType: "BREAKFAST",
    order: 1,
    items: [
      {
        id: "i1",
        foodId: "f1",
        foodPortionId: "pu",
        quantity: 2,
        unit: "unidade",
        order: 1,
        substitutions,
      },
    ],
  },
];

const prescription = (
  versions: Version[],
  planningMode: Prescription["planningMode"] = "SUBSTITUTIONS_ONLY",
): Prescription => ({ id: "rx1", patientId: PATIENT, planningMode, status: "ACTIVE", versions });

interface Call {
  kind: string;
  id?: string;
  body?: unknown;
}

interface Options {
  prescriptions: Prescription[];
  calendar?: Calendar;
  /** Status HTTP do próximo PUT do rascunho. */
  putStatus?: number;
  /** O que o refetch da lista devolve depois de uma ação. */
  afterPut?: Prescription[];
}

function mockApi(options: Options) {
  const calls: Call[] = [];
  let current = options.prescriptions;
  server.use(
    http.get("*/api/v1/nutritionists/me/patients/:id/prescriptions", () =>
      HttpResponse.json(current),
    ),
    http.post("*/api/v1/nutritionists/me/patients/:id/prescriptions", async ({ request }) => {
      const body = await request.json();
      calls.push({ kind: "create", body });
      current = [prescription([draftVersion()], (body as Prescription).planningMode)];
      return HttpResponse.json(current[0]);
    }),
    http.put("*/api/v1/prescription-versions/:versionId", async ({ request, params }) => {
      calls.push({ kind: "save", id: params.versionId as string, body: await request.json() });
      if (options.putStatus) {
        if (options.afterPut) current = options.afterPut;
        return HttpResponse.json({ code: "CONFLICT" }, { status: options.putStatus });
      }
      return HttpResponse.json(draftVersion());
    }),
    http.post("*/api/v1/prescription-versions/:versionId/publish", ({ params }) => {
      calls.push({ kind: "publish", id: params.versionId as string });
      return HttpResponse.json(draftVersion({ status: "PUBLISHED" }));
    }),
    http.post("*/api/v1/prescription-versions/:versionId/archive", ({ params }) => {
      calls.push({ kind: "archive", id: params.versionId as string });
      current = current.map((p) => ({
        ...p,
        versions: p.versions?.map((v) =>
          v.id === params.versionId ? { ...v, status: "ARCHIVED" as const } : v,
        ),
      }));
      return HttpResponse.json({});
    }),
    http.put("*/api/v1/prescriptions/:id/planning-mode", async ({ request }) => {
      const body = (await request.json()) as { planningMode: Prescription["planningMode"] };
      calls.push({ kind: "mode", body });
      current = current.map((p) => ({ ...p, planningMode: body.planningMode }));
      return HttpResponse.json(current[0]);
    }),
    http.get("*/api/v1/nutritionists/me/patients/:id/calendar-periods", () =>
      HttpResponse.json(options.calendar ?? {}),
    ),
    http.get("*/api/v1/foods", () =>
      HttpResponse.json({ content: [{ id: "f1", name: "Ovo cozido", category: "Ovos" }] }),
    ),
    http.get("*/api/v1/foods/:id/portions", () => HttpResponse.json(PORTIONS)),
    http.get("*/api/v1/foods/:id", ({ params }) =>
      HttpResponse.json({
        id: params.id,
        name: params.id === "f2" ? "Queijo minas" : "Ovo cozido",
      }),
    ),
  );
  return calls;
}

function PanelRoute() {
  const { patientId = "" } = useParams();
  return <PrescriptionPanel patientId={patientId} />;
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      { path: "/pacientes/:patientId", element: <PanelRoute /> },
      { path: "/pacientes/:patientId/prescricao/:versionId", element: <PrescriptionEditorPage /> },
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

const editorUrl = (versionId = "v1") => `/pacientes/${PATIENT}/prescricao/${versionId}`;

/** Marca "Incluir esta refeição" na categoria e adiciona o Ovo cozido como item. */
async function addEgg(user: ReturnType<typeof userEvent.setup>, category = "Café da manhã") {
  const group = await screen.findByRole("group", { name: category });
  await user.click(within(group).getByLabelText("Incluir esta refeição"));
  await user.click(within(group).getByRole("button", { name: `Adicionar item a ${category}` }));
  await user.type(within(group).getByLabelText(`Buscar alimento para ${category}`), "ovo");
  await user.click(await within(group).findByRole("button", { name: /Ovo cozido/ }));
  return group;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Criar prescrição", () => {
  it("abre o diálogo com 'Permitir substituições' sugerido e cria com meals vazio", async () => {
    const user = userEvent.setup();
    const calls = mockApi({ prescriptions: [] });
    const router = renderAt(`/pacientes/${PATIENT}`);

    await user.click(await screen.findByRole("button", { name: "Criar prescrição" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("radio", { name: /Permitir substituições/ })).toBeChecked();
    expect(within(dialog).getByText("Sugerido")).toBeVisible();
    expect(within(dialog).queryByText(/SUBSTITUTIONS_ONLY|RESTRICTED|FREE/)).toBeNull();

    await user.click(within(dialog).getByRole("button", { name: "Criar prescrição" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(editorUrl("v1")));
    expect(calls).toEqual([
      { kind: "create", body: { planningMode: "SUBSTITUTIONS_ONLY", meals: [] } },
    ]);
    expect(await screen.findByText("Versão 1 · Rascunho")).toBeVisible();
  });

  it("deixa escolher outro modo antes de criar", async () => {
    const user = userEvent.setup();
    const calls = mockApi({ prescriptions: [] });
    renderAt(`/pacientes/${PATIENT}`);
    await user.click(await screen.findByRole("button", { name: "Criar prescrição" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("radio", { name: /Seguir o plano/ }));
    await user.click(within(dialog).getByRole("button", { name: "Criar prescrição" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toEqual({ planningMode: "RESTRICTED", meals: [] });
  });
});

describe("Editor: editar e salvar", () => {
  it("monta refeição, item (múltiplos da porção) e metas, e salva só pelo botão", async () => {
    const user = userEvent.setup();
    const calls = mockApi({ prescriptions: [prescription([draftVersion()])] });
    renderAt(editorUrl());

    const group = await addEgg(user);
    // A porção mais caseira vem pré-selecionada, em múltiplos dela.
    expect(within(group).getByLabelText("Porção de Ovo cozido")).toHaveDisplayValue("1 unidade");
    const amount = within(group).getByLabelText("Quantidade de Ovo cozido");
    await user.clear(amount);
    await user.type(amount, "2");
    await user.type(within(group).getByLabelText("Horário sugerido (opcional)"), "07:30");
    await user.type(screen.getByLabelText("Energia (kcal)"), "2000");

    expect(screen.getByText("Alterações não salvas")).toBeVisible();
    expect(calls).toEqual([]); // nada é salvo sozinho

    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      kind: "save",
      id: "v1",
      body: {
        meals: [
          {
            name: "Café da manhã",
            mealType: "BREAKFAST",
            order: 1,
            suggestedTime: "07:30:00",
            items: [
              {
                foodId: "f1",
                foodPortionId: "pu",
                quantity: 2,
                unit: "unidade",
                order: 1,
                substitutions: [],
              },
            ],
          },
        ],
        nutritionTargets: [{ nutrientCode: "energy_kcal", amount: 2000, unit: "kcal" }],
      },
    });
    expect(await screen.findByText(/^Salvo às \d{2}:\d{2}$/)).toBeVisible();
    expect(screen.queryByText("Alterações não salvas")).toBeNull();
  });

  it("para a porção em gramas, a quantidade é digitada direto em g", async () => {
    const user = userEvent.setup();
    const calls = mockApi({ prescriptions: [prescription([draftVersion()])] });
    renderAt(editorUrl());

    const group = await addEgg(user);
    await user.selectOptions(within(group).getByLabelText("Porção de Ovo cozido"), "100 g");
    const amount = within(group).getByLabelText("Quantidade de Ovo cozido");
    expect(amount).toHaveValue("100");
    await user.clear(amount);
    await user.type(amount, "250");
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() => expect(calls).toHaveLength(1));
    const body = calls[0].body as { meals: { items: object[] }[] };
    expect(body.meals[0].items[0]).toMatchObject({
      foodPortionId: "p100",
      quantity: 250,
      unit: "g",
    });
  });

  it("carrega o rascunho salvo e mostra os itens nas quantidades de antes", async () => {
    mockApi({ prescriptions: [prescription([draftVersion({ meals: breakfast() })])] });
    renderAt(editorUrl());
    const group = await screen.findByRole("group", { name: "Café da manhã" });
    expect(await within(group).findByLabelText("Quantidade de Ovo cozido")).toHaveValue("2");
    expect(within(group).getByLabelText("Incluir esta refeição")).toBeChecked();
    expect(screen.queryByText("Alterações não salvas")).toBeNull();
  });

  it("bloqueia o salvamento com quantidade inválida", async () => {
    const user = userEvent.setup();
    const calls = mockApi({
      prescriptions: [prescription([draftVersion({ meals: breakfast() })])],
    });
    renderAt(editorUrl());
    const amount = await screen.findByLabelText("Quantidade de Ovo cozido");
    await user.clear(amount);
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(await screen.findByText("Informe uma quantidade maior que zero.")).toBeVisible();
    expect(calls).toEqual([]);
  });

  it("avisa que o alimento não tem porções e não o adiciona", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    server.use(http.get("*/api/v1/foods/:id/portions", () => HttpResponse.json([])));
    renderAt(editorUrl());
    const group = await screen.findByRole("group", { name: "Almoço" });
    await user.click(within(group).getByLabelText("Incluir esta refeição"));
    await user.click(within(group).getByRole("button", { name: "Adicionar item a Almoço" }));
    await user.type(within(group).getByLabelText("Buscar alimento para Almoço"), "ovo");
    await user.click(await within(group).findByRole("button", { name: /Ovo cozido/ }));
    expect(await within(group).findByText(/não tem porções cadastradas/)).toBeVisible();
    expect(within(group).queryByLabelText("Quantidade de Ovo cozido")).toBeNull();
  });

  it("mostra erro de busca de alimentos e estado vazio", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    server.use(http.get("*/api/v1/foods", () => HttpResponse.json({ content: [] })));
    renderAt(editorUrl());
    const group = await screen.findByRole("group", { name: "Jantar" });
    await user.click(within(group).getByLabelText("Incluir esta refeição"));
    await user.click(within(group).getByRole("button", { name: "Adicionar item a Jantar" }));
    await user.type(within(group).getByLabelText("Buscar alimento para Jantar"), "xyz");
    expect(await within(group).findByText("Nenhum alimento encontrado.")).toBeVisible();
    server.use(http.get("*/api/v1/foods", () => HttpResponse.json({}, { status: 500 })));
    await user.type(within(group).getByLabelText("Buscar alimento para Jantar"), "w");
    expect(await within(group).findByText(/Não foi possível buscar alimentos/)).toBeVisible();
  });

  it("mostra erro ao salvar e mantém as alterações", async () => {
    const user = userEvent.setup();
    mockApi({
      prescriptions: [prescription([draftVersion({ meals: breakfast() })])],
      putStatus: 500,
    });
    renderAt(editorUrl());
    const amount = await screen.findByLabelText("Quantidade de Ovo cozido");
    await user.type(amount, "5");
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(await screen.findByText("Não foi possível salvar o rascunho")).toBeVisible();
    expect(screen.getByLabelText("Quantidade de Ovo cozido")).toHaveValue("25");
  });

  it("409 ao salvar: avisa que foi publicado em outra aba e recarrega", async () => {
    const user = userEvent.setup();
    mockApi({
      prescriptions: [prescription([draftVersion({ meals: breakfast() })])],
      putStatus: 409,
      afterPut: [prescription([draftVersion({ status: "PUBLISHED", meals: breakfast() })])],
    });
    renderAt(editorUrl());
    await user.type(await screen.findByLabelText("Quantidade de Ovo cozido"), "5");
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    expect(
      await screen.findByText(
        "Este rascunho foi publicado em outra aba. Recarregue para ver a versão atual.",
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Recarregar" }));
    expect(await screen.findByText("Esta versão não é mais um rascunho")).toBeVisible();
  });
});

describe("Editor: aviso ao sair com alterações pendentes", () => {
  const beforeUnload = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it("não avisa sem alterações", async () => {
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    renderAt(editorUrl());
    await screen.findByText("Versão 1 · Rascunho");
    expect(beforeUnload()).toBe(false);
  });

  it("avisa no navegador e bloqueia a navegação interna; deixa sair se a pessoa confirmar", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    const router = renderAt(editorUrl());
    const group = await screen.findByRole("group", { name: "Almoço" });
    await user.click(within(group).getByLabelText("Incluir esta refeição"));

    expect(beforeUnload()).toBe(true);

    await user.click(screen.getByRole("link", { name: "Voltar para o paciente" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Sair sem salvar?" });
    await user.click(within(dialog).getByRole("button", { name: "Continuar editando" }));
    expect(router.state.location.pathname).toBe(editorUrl());

    await user.click(screen.getByRole("link", { name: "Voltar para o paciente" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Sair sem salvar",
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(`/pacientes/${PATIENT}`));
  });

  it("depois de salvar, volta a sair sem aviso", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    const router = renderAt(editorUrl());
    const group = await screen.findByRole("group", { name: "Almoço" });
    await user.click(within(group).getByLabelText("Incluir esta refeição"));
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await screen.findByText(/^Salvo às/);
    expect(beforeUnload()).toBe(false);
    await user.click(screen.getByRole("link", { name: "Voltar para o paciente" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/pacientes/${PATIENT}`));
  });
});

describe("Editor: substituições", () => {
  const sub = { id: "s1", foodId: "f2", foodPortionId: "pu", quantity: 1, unit: "unidade" };

  it("avisa, sem bloquear, quando o modo não é 'Permitir substituições'", async () => {
    mockApi({
      prescriptions: [prescription([draftVersion({ meals: breakfast([sub]) })], "RESTRICTED")],
    });
    renderAt(editorUrl());
    expect(
      await screen.findByText(
        "Com o modo Seguir o plano, o paciente não vê as substituições. Altere o modo na aba Prescrição.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeEnabled();
  });

  it("não avisa no modo 'Permitir substituições'", async () => {
    mockApi({ prescriptions: [prescription([draftVersion({ meals: breakfast([sub]) })])] });
    renderAt(editorUrl());
    await screen.findByLabelText("Quantidade de Ovo cozido");
    expect(screen.queryByText(/o paciente não vê as substituições/)).toBeNull();
  });

  it("adiciona uma substituição pelo mesmo seletor e a envia com observação", async () => {
    const user = userEvent.setup();
    const calls = mockApi({
      prescriptions: [prescription([draftVersion({ meals: breakfast() })])],
    });
    renderAt(editorUrl());
    await screen.findByLabelText("Quantidade de Ovo cozido");

    await user.click(screen.getByRole("button", { name: "Substituições (0) de Ovo cozido" }));
    await user.click(screen.getByRole("button", { name: "Adicionar substituição a Ovo cozido" }));
    await user.type(screen.getByLabelText("Alimento substituto de Ovo cozido"), "ovo");
    const results = await screen.findByRole("list", { name: "Resultados da busca" });
    await user.click(within(results).getByRole("button", { name: /Ovo cozido/ }));
    await user.type(screen.getByLabelText("Observação da substituição Ovo cozido"), "Sem sal");
    expect(screen.getByRole("button", { name: "Substituições (1) de Ovo cozido" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    const body = calls[0].body as { meals: { items: { substitutions: object[] }[] }[] };
    expect(body.meals[0].items[0].substitutions).toEqual([
      { foodId: "f1", foodPortionId: "pu", quantity: 1, unit: "unidade", notes: "Sem sal" },
    ]);
  });
});

describe("Publicar", () => {
  it("fica desabilitado, com explicação, enquanto há refeição incluída sem item", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([draftVersion({ meals: breakfast() })])] });
    renderAt(editorUrl());
    const publish = await screen.findByRole("button", { name: "Publicar versão" });
    await waitFor(() => expect(publish).toBeEnabled());

    const group = screen.getByRole("group", { name: "Almoço" });
    await user.click(within(group).getByLabelText("Incluir esta refeição"));
    expect(publish).toBeDisabled();
    expect(screen.getByText("Salve o rascunho para poder publicar.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(await screen.findByText(/Inclua pelo menos um item em Almoço/)).toBeVisible();
    expect(publish).toBeDisabled();
    expect(publish).toHaveAccessibleDescription(/Inclua pelo menos um item em Almoço/);

    await user.click(within(group).getByLabelText("Incluir esta refeição"));
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(publish).toBeEnabled());
  });

  it("não deixa publicar sem nenhuma refeição incluída", async () => {
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    renderAt(editorUrl());
    expect(await screen.findByRole("button", { name: "Publicar versão" })).toBeDisabled();
    expect(
      screen.getByText("Inclua pelo menos uma refeição com itens para poder publicar."),
    ).toBeVisible();
  });

  it("com plano ativo, o diálogo diz a partir de quando a versão vale", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 16, 12, 0, 0));
    const user = userEvent.setup();
    const calls = mockApi({
      prescriptions: [prescription([draftVersion({ number: 3, meals: breakfast() })])],
      calendar: { plans: [{ planId: "pl1", start: "2026-11-14", end: "2026-11-20" }] },
    });
    const router = renderAt(editorUrl());
    await user.click(await screen.findByRole("button", { name: "Publicar versão" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Publicar a versão 3?" });
    expect(
      await within(dialog).findByText(
        "A versão 3 passa a valer no próximo plano do paciente, a partir de 21/11/2026. Para valer antes, o paciente pode regenerar o plano no app.",
      ),
    ).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Publicar versão" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/pacientes/${PATIENT}`));
    expect(calls).toEqual([{ kind: "publish", id: "v1" }]);
  });

  it("sem plano ativo, diz só 'no próximo plano do paciente'", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 16, 12, 0, 0));
    const user = userEvent.setup();
    mockApi({
      prescriptions: [prescription([draftVersion({ meals: breakfast() })])],
      // Só um plano que já terminou: não há plano ativo.
      calendar: { plans: [{ planId: "pl0", start: "2026-10-01", end: "2026-10-07" }] },
    });
    renderAt(editorUrl());
    await user.click(await screen.findByRole("button", { name: "Publicar versão" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(
      await within(dialog).findByText(
        "A versão 1 passa a valer no próximo plano do paciente. Para valer antes, o paciente pode regenerar o plano no app.",
      ),
    ).toBeVisible();
  });

  it("mostra o erro do servidor ao publicar", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([draftVersion({ meals: breakfast() })])] });
    server.use(
      http.post("*/api/v1/prescription-versions/:id/publish", () =>
        HttpResponse.json({ code: "X", message: "Falhou." }, { status: 422 }),
      ),
    );
    renderAt(editorUrl());
    await user.click(await screen.findByRole("button", { name: "Publicar versão" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Publicar versão",
      }),
    );
    expect(await screen.findByText("Não foi possível publicar a versão")).toBeVisible();
    expect(screen.getByText("Falhou.")).toBeVisible();
  });
});

describe("Modo de planejamento (aba Prescrição)", () => {
  it("antes da primeira publicação, a troca é livre, sem confirmação", async () => {
    const user = userEvent.setup();
    const calls = mockApi({ prescriptions: [prescription([draftVersion()])] });
    renderAt(`/pacientes/${PATIENT}`);
    await user.click(await screen.findByRole("radio", { name: /Seguir o plano/ }));
    await waitFor(() =>
      expect(calls).toEqual([{ kind: "mode", body: { planningMode: "RESTRICTED" } }]),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /Seguir o plano/ })).toBeChecked(),
    );
  });

  it("depois da primeira publicação, pede confirmação e só então troca", async () => {
    const user = userEvent.setup();
    const published = draftVersion({
      id: "v1",
      number: 1,
      status: "PUBLISHED",
      publishedAt: "2026-11-02T10:00:00Z",
    });
    const calls = mockApi({ prescriptions: [prescription([published])] });
    renderAt(`/pacientes/${PATIENT}`);

    await user.click(await screen.findByRole("radio", { name: /Montagem livre/ }));
    let dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(
        "A mudança vale no app do paciente imediatamente, sem publicar nova versão.",
      ),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(calls).toEqual([]);
    expect(screen.getByRole("radio", { name: /Permitir substituições/ })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /Montagem livre/ }));
    dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Alterar modo" }));
    await waitFor(() => expect(calls).toEqual([{ kind: "mode", body: { planningMode: "FREE" } }]));
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /Montagem livre/ })).toBeChecked(),
    );
  });

  it("depois de arquivar tudo, a troca continua pedindo confirmação", async () => {
    const user = userEvent.setup();
    const archived = draftVersion({ status: "ARCHIVED", publishedAt: "2026-11-02T10:00:00Z" });
    mockApi({ prescriptions: [prescription([archived])] });
    renderAt(`/pacientes/${PATIENT}`);
    await user.click(await screen.findByRole("radio", { name: /Seguir o plano/ }));
    expect(await screen.findByRole("alertdialog")).toBeVisible();
  });

  it("mostra o erro e mantém o modo quando a troca falha", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    server.use(
      http.put("*/api/v1/prescriptions/:id/planning-mode", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderAt(`/pacientes/${PATIENT}`);
    await user.click(await screen.findByRole("radio", { name: /Seguir o plano/ }));
    expect(
      await screen.findByText("Não foi possível alterar o modo de planejamento"),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: /Permitir substituições/ })).toBeChecked();
  });
});

describe("Arquivar versão vigente", () => {
  const published = draftVersion({
    id: "v2",
    number: 2,
    status: "PUBLISHED",
    publishedAt: "2026-11-02T10:00:00Z",
  });

  it("confirma com o texto de perigo e depois mostra 'Sem versão vigente'", async () => {
    const user = userEvent.setup();
    const calls = mockApi({ prescriptions: [prescription([published])] });
    renderAt(`/pacientes/${PATIENT}`);

    await user.click(await screen.findByRole("button", { name: "Arquivar versão" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Arquivar a versão 2?" });
    expect(
      within(dialog).getByText(
        "O paciente mantém o plano da semana em curso, mas nenhum plano novo será gerado até você publicar outra versão.",
      ),
    ).toBeVisible();
    expect(calls).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Arquivar versão" }));

    expect(await screen.findByText("Sem versão vigente")).toBeVisible();
    expect(calls).toEqual([{ kind: "archive", id: "v2" }]);
    expect(screen.queryByRole("button", { name: "Arquivar versão" })).toBeNull();
  });

  it("não oferece arquivar quando só há rascunho", async () => {
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    renderAt(`/pacientes/${PATIENT}`);
    expect(await screen.findByText("Sem versão vigente")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Arquivar versão" })).toBeNull();
    expect(screen.getByRole("button", { name: "Continuar rascunho" })).toBeVisible();
  });

  it("mostra o erro se o servidor recusar", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([published])] });
    server.use(
      http.post("*/api/v1/prescription-versions/:id/archive", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderAt(`/pacientes/${PATIENT}`);
    await user.click(await screen.findByRole("button", { name: "Arquivar versão" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Arquivar versão",
      }),
    );
    expect(await screen.findByText("Não foi possível arquivar a versão")).toBeVisible();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("409 ao arquivar: Alert com Recarregar", async () => {
    const user = userEvent.setup();
    mockApi({ prescriptions: [prescription([published])] });
    server.use(
      http.post("*/api/v1/prescription-versions/:id/archive", () =>
        HttpResponse.json(
          { status: 409, code: "PRESCRIPTION_CONFLICT", message: "x" },
          { status: 409 },
        ),
      ),
    );
    renderAt(`/pacientes/${PATIENT}`);
    await user.click(await screen.findByRole("button", { name: "Arquivar versão" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Arquivar versão",
      }),
    );
    expect(await screen.findByText("Não foi possível arquivar a versão")).toBeVisible();
    expect(screen.getByRole("button", { name: "Recarregar" })).toBeVisible();
  });
});

/** Handlers de descartar e de nova versão; `current` espelha o que o servidor guardaria. */
function mockDiscardAndNewVersion(
  initial: Prescription[],
  options: { deleteStatus?: number; createStatus?: number } = {},
) {
  const calls: Call[] = [];
  let current = initial;
  server.use(
    http.get("*/api/v1/nutritionists/me/patients/:id/prescriptions", () =>
      HttpResponse.json(current),
    ),
    http.delete("*/api/v1/prescription-versions/:versionId", ({ params }) => {
      calls.push({ kind: "discard", id: params.versionId as string });
      if (options.deleteStatus) {
        return HttpResponse.json(
          { status: options.deleteStatus, code: "PRESCRIPTION_CONFLICT", message: "x" },
          { status: options.deleteStatus },
        );
      }
      current = current
        .map((p) => ({ ...p, versions: p.versions?.filter((v) => v.id !== params.versionId) }))
        .filter((p) => (p.versions?.length ?? 0) > 0);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post("*/api/v1/prescriptions/:id/versions", ({ params }) => {
      calls.push({ kind: "new-version", id: params.id as string });
      if (options.createStatus) {
        return HttpResponse.json(
          { status: options.createStatus, code: "PRESCRIPTION_CONFLICT", message: "x" },
          { status: options.createStatus },
        );
      }
      const created = draftVersion({ id: "v9", number: 3 });
      current = current.map((p) => ({ ...p, versions: [...(p.versions ?? []), created] }));
      return HttpResponse.json(created);
    }),
  );
  return calls;
}

describe("Descartar rascunho", () => {
  const published = draftVersion({
    id: "v1",
    number: 1,
    status: "PUBLISHED",
    publishedAt: "2026-11-02T10:00:00Z",
  });
  const draft2 = draftVersion({ id: "v2", number: 2 });

  it("na aba, com versão vigente: confirma com o texto de perigo e mantém a vigente", async () => {
    const user = userEvent.setup();
    const initial = [prescription([published, draft2])];
    mockApi({ prescriptions: initial });
    const calls = mockDiscardAndNewVersion(initial);
    renderAt(`/pacientes/${PATIENT}`);

    await user.click(await screen.findByRole("button", { name: "Descartar rascunho" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Descartar o rascunho da versão 2?",
    });
    expect(
      within(dialog).getByText(
        "As alterações deste rascunho serão perdidas. A versão vigente continua com o paciente.",
      ),
    ).toBeVisible();
    expect(calls).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Descartar rascunho" }));

    await waitFor(() => expect(screen.queryByText("Há um rascunho não publicado")).toBeNull());
    expect(calls).toEqual([{ kind: "discard", id: "v2" }]);
    expect(screen.getByText("Prescrição vigente")).toBeVisible();
  });

  it("na aba, sem nunca ter publicado: a página volta para 'Criar prescrição'", async () => {
    const user = userEvent.setup();
    const initial = [prescription([draftVersion()])];
    mockApi({ prescriptions: initial });
    mockDiscardAndNewVersion(initial);
    renderAt(`/pacientes/${PATIENT}`);

    await user.click(await screen.findByRole("button", { name: "Descartar rascunho" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(
        "As alterações deste rascunho serão perdidas e a prescrição volta a não existir.",
      ),
    ).toBeVisible();
    expect(within(dialog).queryByText(/versão vigente/)).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Descartar rascunho" }));

    expect(await screen.findByRole("button", { name: "Criar prescrição" })).toBeVisible();
  });

  it("cancelar não chama o servidor", async () => {
    const user = userEvent.setup();
    const initial = [prescription([published, draft2])];
    mockApi({ prescriptions: initial });
    const calls = mockDiscardAndNewVersion(initial);
    renderAt(`/pacientes/${PATIENT}`);

    await user.click(await screen.findByRole("button", { name: "Descartar rascunho" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(calls).toEqual([]);
  });

  it("409 na aba: avisa e recarrega", async () => {
    const user = userEvent.setup();
    const initial = [prescription([published, draft2])];
    mockApi({ prescriptions: initial });
    mockDiscardAndNewVersion(initial, { deleteStatus: 409 });
    renderAt(`/pacientes/${PATIENT}`);

    await user.click(await screen.findByRole("button", { name: "Descartar rascunho" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Descartar rascunho",
      }),
    );
    expect(await screen.findByText("Não foi possível descartar o rascunho")).toBeVisible();
    expect(screen.getByRole("button", { name: "Recarregar" })).toBeVisible();
  });

  it("no editor com alterações pendentes: volta ao paciente sem o aviso de sair", async () => {
    const user = userEvent.setup();
    const initial = [prescription([published, draft2])];
    mockApi({ prescriptions: initial });
    const calls = mockDiscardAndNewVersion(initial);
    const router = renderAt(editorUrl("v2"));

    await addEgg(user);
    expect(await screen.findByText("Alterações não salvas")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Descartar rascunho" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Descartar rascunho",
      }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe(`/pacientes/${PATIENT}`));
    expect(screen.queryByRole("alertdialog", { name: "Sair sem salvar?" })).toBeNull();
    expect(calls).toEqual([{ kind: "discard", id: "v2" }]);
    expect(await screen.findByText("Prescrição vigente")).toBeVisible();
  });

  it("no editor, sendo o único rascunho: o texto não fala em versão vigente", async () => {
    const user = userEvent.setup();
    const initial = [prescription([draftVersion()])];
    mockApi({ prescriptions: initial });
    mockDiscardAndNewVersion(initial);
    const router = renderAt(editorUrl("v1"));

    await user.click(await screen.findByRole("button", { name: "Descartar rascunho" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/a prescrição volta a não existir/)).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Descartar rascunho" }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/pacientes/${PATIENT}`));
    expect(await screen.findByRole("button", { name: "Criar prescrição" })).toBeVisible();
  });

  it("409 no editor: Alert com Recarregar; recarregado, a versão não é mais rascunho", async () => {
    const user = userEvent.setup();
    const initial = [prescription([draftVersion()])];
    mockApi({ prescriptions: initial });
    mockDiscardAndNewVersion(initial, { deleteStatus: 409 });
    renderAt(editorUrl("v1"));

    await user.click(await screen.findByRole("button", { name: "Descartar rascunho" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Descartar rascunho",
      }),
    );
    expect(await screen.findByText("Não foi possível descartar o rascunho")).toBeVisible();
    expect(screen.getByRole("button", { name: "Recarregar" })).toBeVisible();
  });
});

describe("Nova versão", () => {
  const published = draftVersion({
    id: "v2",
    number: 2,
    status: "PUBLISHED",
    publishedAt: "2026-11-02T10:00:00Z",
  });
  const archived = { ...published, status: "ARCHIVED" as const };

  it("em 'Sem versão vigente': cria o rascunho e abre o editor nele", async () => {
    const user = userEvent.setup();
    const initial = [prescription([archived])];
    mockApi({ prescriptions: initial });
    const calls = mockDiscardAndNewVersion(initial);
    const router = renderAt(`/pacientes/${PATIENT}`);

    expect(await screen.findByText("Sem versão vigente")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Nova versão" }));

    await waitFor(() => expect(router.state.location.pathname).toBe(editorUrl("v9")));
    expect(calls).toEqual([{ kind: "new-version", id: "rx1" }]);
    expect(await screen.findByText("Versão 3 · Rascunho")).toBeVisible();
  });

  it("não aparece quando já existe rascunho (aparece 'Continuar rascunho')", async () => {
    const initial = [prescription([archived, draftVersion({ id: "v3", number: 3 })])];
    mockApi({ prescriptions: initial });
    renderAt(`/pacientes/${PATIENT}`);
    expect(await screen.findByRole("button", { name: "Continuar rascunho" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nova versão" })).toBeNull();
  });

  it("409: Alert com Recarregar", async () => {
    const user = userEvent.setup();
    const initial = [prescription([archived])];
    mockApi({ prescriptions: initial });
    mockDiscardAndNewVersion(initial, { createStatus: 409 });
    renderAt(`/pacientes/${PATIENT}`);

    await user.click(await screen.findByRole("button", { name: "Nova versão" }));
    expect(await screen.findByText("Não foi possível criar a nova versão")).toBeVisible();
    expect(screen.getByRole("button", { name: "Recarregar" })).toBeVisible();
  });
});

describe("Editor: estados de carga", () => {
  it("avisa quando a versão não existe", async () => {
    mockApi({ prescriptions: [prescription([draftVersion()])] });
    renderAt(editorUrl("nao-existe"));
    expect(await screen.findByText("Rascunho não encontrado")).toBeVisible();
  });

  it("oferece tentar de novo quando a carga falha", async () => {
    mockApi({ prescriptions: [] });
    server.use(
      http.get("*/api/v1/nutritionists/me/patients/:id/prescriptions", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderAt(editorUrl());
    expect(await screen.findByText("Não foi possível carregar o rascunho")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
  });
});

describe("Modelo do editor", () => {
  const egg = { id: "f1", name: "Ovo" };
  const portions = [
    { id: "p100", label: "100 g", quantity: 100, unit: "g" },
    { id: "pu", label: "1 fatia média", quantity: 1, unit: "fatia" },
  ];

  it("pré-seleciona a porção mais caseira, não a de gramas", () => {
    expect(newEntry(egg, portions).portionIndex).toBe(1);
  });

  it("trata a porção caseira do catálogo em g como múltiplos, pelo type", () => {
    // No catálogo real a colher vem em g: "Colher servir cheia", 55 g, type HOUSEHOLD.
    const rice = toPortionRefs([
      { id: "p100", label: "100 g", quantity: 100, unit: "g", type: "STANDARD", active: true },
      { id: "pc", label: "Colher servir cheia", quantity: 55, unit: "g", type: "HOUSEHOLD" },
    ]);
    const entry = newEntry({ id: "f9", name: "Arroz" }, rice);
    expect(entry.portionIndex).toBe(1);
    expect(entry.amount).toBe("1");
    expect(entryQuantity({ ...entry, amount: "2" })).toEqual({ quantity: 110, unit: "g" });
    expect(
      entryFromSaved(
        { foodPortionId: "pc", quantity: 110, unit: "g" },
        { id: "f9", name: "Arroz" },
        rice,
      ).amount,
    ).toBe("2");
  });

  it("só envia refeições incluídas e metas preenchidas, com order da ordem fixa", () => {
    const draft = emptyDraft();
    draft.meals[2].included = true;
    draft.meals[2].items = [{ ...newEntry(egg, portions), substitutions: [] }];
    draft.targets.protein = "90,5";
    const body = toRequest(draft);
    expect(body.meals).toHaveLength(1);
    expect(body.meals[0]).toMatchObject({ mealType: "SNACK", order: 3, name: "Lanche" });
    expect(body.nutritionTargets).toEqual([{ nutrientCode: "protein", amount: 90.5, unit: "g" }]);
  });

  it("volta da quantidade salva para múltiplos da porção", () => {
    const entry = entryFromSaved(
      { foodPortionId: "pu", quantity: 3, unit: "fatia" },
      egg,
      portions,
    );
    expect(entry.amount).toBe("3");
    const grams = entryFromSaved(
      { foodPortionId: "p100", quantity: 250, unit: "g" },
      egg,
      portions,
    );
    expect(grams.amount).toBe("250");
  });

  it("mantém a quantidade salva quando a porção saiu do catálogo", () => {
    const entry = entryFromSaved(
      { foodPortionId: "gone", quantity: 4, unit: "colher" },
      egg,
      portions,
    );
    expect(entry.portions[entry.portionIndex]).toMatchObject({ id: "gone", unit: "colher" });
    expect(entry.amount).toBe("4");
  });
});
