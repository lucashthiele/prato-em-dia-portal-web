import type { AuditQuery } from "../api/audit";
import type { UsersQuery } from "../api/users";
import type { Role } from "./labels";

export const PAGE_SIZE = 20;

// A URL fala português e nunca expõe os enums da API.
const ROLE_PARAM: Record<Role, string> = {
  NUTRITIONIST: "nutricionista",
  PATIENT: "paciente",
  ADMIN: "administrador",
};
const STATUS_PARAM = { ACTIVE: "ativa", INACTIVE: "desativada" } as const;
type Status = keyof typeof STATUS_PARAM;

export interface UserFilters {
  q: string;
  role?: Role;
  status?: Status;
  /** Base 1, como na URL. */
  page: number;
}

export const DEFAULT_USER_FILTERS: UserFilters = { q: "", page: 1 };

function pageOf(params: URLSearchParams): number {
  const page = Number(params.get("pagina"));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

function keyOf<K extends string>(map: Record<K, string>, value: string | null): K | undefined {
  return (Object.keys(map) as K[]).find((key) => map[key] === value);
}

export function parseUserFilters(params: URLSearchParams): UserFilters {
  return {
    q: params.get("busca")?.trim() ?? "",
    role: keyOf(ROLE_PARAM, params.get("papel")),
    status: keyOf(STATUS_PARAM, params.get("situacao")),
    page: pageOf(params),
  };
}

export function userFiltersToParams(filters: UserFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("busca", filters.q);
  if (filters.role) params.set("papel", ROLE_PARAM[filters.role]);
  if (filters.status) params.set("situacao", STATUS_PARAM[filters.status]);
  if (filters.page > 1) params.set("pagina", String(filters.page));
  return params;
}

export function hasActiveUserFilters(filters: UserFilters): boolean {
  return filters.q !== "" || filters.role !== undefined || filters.status !== undefined;
}

export function userFiltersToQuery(filters: UserFilters): UsersQuery {
  return {
    page: filters.page - 1,
    size: PAGE_SIZE,
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}

// Auditoria ---------------------------------------------------------------

type AuditAction = NonNullable<AuditQuery["action"]>;

const ACTION_PARAM: Record<AuditAction, string> = {
  NUTRITIONIST_CREATED: "cadastro",
  ACCESS_EMAIL_RESENT: "reenvio",
  USER_STATUS_CHANGED: "situacao",
  RELATIONSHIPS_ENDED: "vinculos",
};

/** Só as ações que o filtro do servidor aceita. */
export const AUDIT_ACTION_FILTERS: { value: AuditAction; label: string }[] = [
  { value: "NUTRITIONIST_CREATED", label: "Nutricionista cadastrado" },
  { value: "ACCESS_EMAIL_RESENT", label: "E-mail de acesso reenviado" },
  { value: "USER_STATUS_CHANGED", label: "Conta ativada ou desativada" },
  { value: "RELATIONSHIPS_ENDED", label: "Vínculos encerrados" },
];

export interface AuditFilters {
  /** Datas locais `AAAA-MM-DD`, como no campo de data. */
  from: string;
  to: string;
  action?: AuditAction;
  targetId: string;
  page: number;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = { from: "", to: "", targetId: "", page: 1 };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAuditFilters(params: URLSearchParams): AuditFilters {
  const from = params.get("de") ?? "";
  const to = params.get("ate") ?? "";
  const targetId = params.get("alvo") ?? "";
  return {
    from: DATE.test(from) ? from : "",
    to: DATE.test(to) ? to : "",
    action: keyOf(ACTION_PARAM, params.get("acao")),
    targetId: UUID.test(targetId) ? targetId : "",
    page: pageOf(params),
  };
}

export function auditFiltersToParams(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.from) params.set("de", filters.from);
  if (filters.to) params.set("ate", filters.to);
  if (filters.action) params.set("acao", ACTION_PARAM[filters.action]);
  if (filters.targetId) params.set("alvo", filters.targetId);
  if (filters.page > 1) params.set("pagina", String(filters.page));
  return params;
}

export function hasActiveAuditFilters(filters: AuditFilters): boolean {
  return Boolean(filters.from || filters.to || filters.action || filters.targetId);
}

export function auditFiltersToQuery(filters: AuditFilters): AuditQuery {
  return {
    page: filters.page - 1,
    size: PAGE_SIZE,
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.targetId ? { targetId: filters.targetId } : {}),
    // O dia inteiro, no fuso do navegador.
    ...(filters.from ? { from: new Date(`${filters.from}T00:00:00`).toISOString() } : {}),
    ...(filters.to ? { to: new Date(`${filters.to}T23:59:59.999`).toISOString() } : {}),
  };
}
