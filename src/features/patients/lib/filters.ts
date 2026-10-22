import type { PatientsQuery } from "../api/patients";

export const PAGE_SIZE = 20;

export type AccessFilter = "PENDING" | "SENT" | "FAILED";
export type SortKey = "recentes" | "antigos" | "nome";

export interface PatientFilters {
  q: string;
  access?: AccessFilter;
  openDrafts: boolean;
  sort: SortKey;
  /** Base 1, como na URL. */
  page: number;
}

// A URL fala português e nunca expõe os enums da API.
const ACCESS_PARAM: Record<AccessFilter, string> = {
  PENDING: "pendente",
  SENT: "enviado",
  FAILED: "falha",
};

const SORT_QUERY: Record<SortKey, NonNullable<PatientsQuery["sort"]>> = {
  recentes: "createdAt,desc",
  antigos: "createdAt,asc",
  nome: "fullName,asc",
};

export const ACCESS_LABEL: Record<AccessFilter, string> = {
  PENDING: "Envio pendente",
  SENT: "Acesso enviado",
  FAILED: "Falha no envio",
};

export const SORT_LABEL: Record<SortKey, string> = {
  recentes: "Mais recentes",
  antigos: "Mais antigos",
  nome: "Nome (A a Z)",
};

export const DEFAULT_FILTERS: PatientFilters = {
  q: "",
  openDrafts: false,
  sort: "recentes",
  page: 1,
};

export function parseFilters(params: URLSearchParams): PatientFilters {
  const access = (Object.keys(ACCESS_PARAM) as AccessFilter[]).find(
    (key) => ACCESS_PARAM[key] === params.get("acesso"),
  );
  const sortParam = params.get("ordem");
  const sort = (Object.keys(SORT_QUERY) as SortKey[]).find((key) => key === sortParam);
  const page = Number(params.get("pagina"));
  return {
    q: params.get("busca")?.trim() ?? "",
    access,
    openDrafts: params.get("filtro") === "rascunhos",
    sort: sort ?? "recentes",
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Omite o que é padrão, para a URL compartilhável ficar curta. */
export function toSearchParams(filters: PatientFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("busca", filters.q);
  if (filters.access) params.set("acesso", ACCESS_PARAM[filters.access]);
  if (filters.openDrafts) params.set("filtro", "rascunhos");
  if (filters.sort !== "recentes") params.set("ordem", filters.sort);
  if (filters.page > 1) params.set("pagina", String(filters.page));
  return params;
}

export function hasActiveFilters(filters: PatientFilters): boolean {
  return filters.q !== "" || filters.access !== undefined || filters.openDrafts;
}

export function toApiQuery(filters: PatientFilters): PatientsQuery {
  return {
    page: filters.page - 1,
    size: PAGE_SIZE,
    sort: SORT_QUERY[filters.sort],
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.access ? { emailDeliveryStatus: filters.access } : {}),
    ...(filters.openDrafts ? { hasOpenDraft: true } : {}),
  };
}
