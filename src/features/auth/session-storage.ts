// Temporário (ADR 0007): tokens em localStorage até a LUC-54 mover a sessão para cookies HttpOnly.
// Todo acesso ao armazenamento fica aqui, para trocar o mecanismo sem mexer nas outras features.
const KEY = "portal.session";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

export function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string") {
      return null;
    }
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
