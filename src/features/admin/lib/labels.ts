import type { Status } from "../../../shared/ui";

// Os enums da API nunca chegam à interface: tudo passa por estes mapas.
export type Role = "PATIENT" | "NUTRITIONIST" | "ADMIN";

export const ROLE_LABEL: Record<Role, string> = {
  NUTRITIONIST: "Nutricionista",
  PATIENT: "Paciente",
  ADMIN: "Administrador",
};

export function roleLabel(role?: string): string {
  return ROLE_LABEL[role as Role] ?? "Conta";
}

export function isActive(status?: string): boolean {
  return status === "ACTIVE";
}

/** Situação da conta com as variantes existentes do `StatusChip` (sem estado novo). */
export function accountChip(status?: string): { status: Status; label: string } {
  return isActive(status)
    ? { status: "active", label: "Ativa" }
    : { status: "ended", label: "Desativada" };
}

export type AccessEmail = "pending" | "sent" | "failed";

export function accessEmailStatus(status?: string): AccessEmail | undefined {
  switch (status) {
    case "PENDING":
      return "pending";
    case "SENT":
      return "sent";
    case "FAILED":
      return "failed";
    default:
      return undefined;
  }
}

export function auditActionLabel(action?: string, details?: string): string {
  switch (action) {
    case "NUTRITIONIST_CREATED":
      return "Nutricionista cadastrado";
    case "ACCESS_EMAIL_RESENT":
      return "E-mail de acesso reenviado";
    case "USER_STATUS_CHANGED":
      return statusFromDetails(details) === "ACTIVE" ? "Conta ativada" : "Conta desativada";
    case "RELATIONSHIPS_ENDED":
      return "Vínculos encerrados";
    default:
      return "Ação administrativa";
  }
}

/**
 * O OpenAPI não descreve `details`. Para a mudança de status, assume que o texto cita o novo
 * estado (`ACTIVE`/`INACTIVE`, possivelmente "de X para Y"): vale a última menção. Sem pista,
 * cai em "Conta desativada", o caso que pede atenção.
 */
function statusFromDetails(details?: string): "ACTIVE" | "INACTIVE" | undefined {
  const mentions = details?.match(/INACTIVE|ACTIVE/g);
  return mentions ? (mentions[mentions.length - 1] as "ACTIVE" | "INACTIVE") : undefined;
}

export function firstName(fullName?: string): string {
  return fullName?.trim().split(/\s+/)[0] || "A pessoa";
}

/**
 * O `details` vem em texto livre do servidor. Em `RELATIONSHIPS_ENDED` é `count=N`; nas demais
 * ações, troca os enums de situação por rótulos.
 */
export function auditDetailText(details?: string, action?: string): string {
  if (!details) return "—";
  if (action === "RELATIONSHIPS_ENDED") {
    const count = Number(/^count=(\d+)$/.exec(details.trim())?.[1]);
    if (!Number.isInteger(count)) return "—";
    return count === 1 ? "1 vínculo encerrado" : `${count} vínculos encerrados`;
  }
  return details
    .replace(/INACTIVE/g, "Desativada")
    .replace(/ACTIVE/g, "Ativa")
    .replace(/\s*->\s*/g, " → ")
    .replace(/^email=/, "E-mail: ");
}

/** Id curto para identificar uma conta sem nome (primeiros 8 caracteres do UUID). */
export function shortId(id: string): string {
  return id.slice(0, 8);
}

/**
 * Nome de uma conta na auditoria (S-09). Os campos vêm nulos quando a conta não tem perfil ou
 * foi removida; nesse caso mostra o e-mail (só do alvo) e, por último, "Conta" + id curto: um
 * texto neutro que não afirma que a conta foi removida (administradores podem não ter perfil).
 */
export function auditAccountName(id?: string, name?: string, email?: string): string | undefined {
  if (!id) return undefined;
  return name || email || `Conta ${shortId(id)}`;
}

/**
 * Autor na auditoria: o nome do perfil e, sem perfil (administrador), a parte do e-mail antes do
 * @, que identifica a conta sem ocupar a coluna. Por último, "Conta" + id curto.
 */
export function auditActorName(id?: string, name?: string, email?: string): string | undefined {
  if (!id) return undefined;
  const handle = email?.split("@")[0];
  return name || handle || `Conta ${shortId(id)}`;
}
