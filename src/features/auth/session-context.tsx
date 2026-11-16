import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, client, configureSession } from "../../shared/api";

/**
 * `loading`: ainda não sabemos se há sessão. `password`: há sessão, mas a senha temporária precisa
 * ser trocada. `consent`: há sessão, mas o backend exige o aceite dos termos antes de liberar o
 * resto. A ordem do primeiro acesso é: login, definir senha, aceitar termos, área do papel.
 */
export type SessionStatus = "loading" | "authenticated" | "password" | "consent" | "anonymous";

export type Role = "ADMIN" | "NUTRITIONIST";

interface SessionContextValue {
  status: SessionStatus;
  /** Papel do usuário; só existe com a sessão liberada (`authenticated`). */
  role: Role | undefined;
  /** Pergunta de novo ao backend (depois do login, da troca de senha ou do aceite dos termos). */
  refresh: () => Promise<SessionStatus>;
  /** O login avisou que a senha é temporária: a troca vem antes de qualquer outra tela. */
  requirePasswordChange: () => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

type BaseStatus = Exclude<SessionStatus, "password">;

// O contrato só tem dois papéis no portal; o servidor recusa `PATIENT` no login (Q4).
const toRole = (value: string | undefined): Role => (value === "ADMIN" ? "ADMIN" : "NUTRITIONIST");

// A sessão são os cookies HttpOnly (ADR 0011); `GET /me` diz se eles ainda valem.
async function probe(): Promise<{ status: BaseStatus; role?: Role }> {
  try {
    const { data } = await client.GET("/api/v1/me");
    return { status: "authenticated", role: toRole(data?.role) };
  } catch (error) {
    return {
      status:
        error instanceof ApiError && error.code === "CONSENT_REQUIRED" ? "consent" : "anonymous",
    };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [base, setBase] = useState<BaseStatus>("loading");
  const [role, setRole] = useState<Role>();
  // O contrato só informa `passwordChangeRequired` na resposta do login; um recarregamento a perde.
  const [passwordRequired, setPasswordRequired] = useState(false);

  const signOut = useCallback(() => {
    setBase("anonymous");
    setRole(undefined);
    setPasswordRequired(false);
    // Nada do usuário anterior pode sobrar no cache.
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    const next = await probe();
    setBase(next.status);
    setRole(next.role);
    setPasswordRequired(false);
    return next.status;
  }, []);

  const requirePasswordChange = useCallback(() => {
    setPasswordRequired(true);
    setBase("authenticated");
  }, []);

  // Layout effect: roda antes dos efeitos das queries filhas.
  useLayoutEffect(() => {
    configureSession({ onExpired: signOut, onConsentRequired: () => setBase("consent") });
    return () => configureSession(null);
  }, [signOut]);

  useEffect(() => {
    let active = true;
    void probe().then((next) => {
      if (!active) return;
      setBase(next.status);
      setRole(next.role);
    });
    return () => {
      active = false;
    };
  }, []);

  const status: SessionStatus = passwordRequired && base !== "anonymous" ? "password" : base;
  const value = useMemo(
    () => ({ status, role, refresh, requirePasswordChange, signOut }),
    [status, role, refresh, requirePasswordChange, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession precisa estar dentro de SessionProvider.");
  return value;
}
