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
 * `loading`: ainda não sabemos se há sessão. `consent`: há sessão, mas o backend exige o aceite
 * dos termos antes de liberar o resto.
 */
export type SessionStatus = "loading" | "authenticated" | "consent" | "anonymous";

interface SessionContextValue {
  status: SessionStatus;
  /** Pergunta de novo ao backend (depois do login ou do aceite dos termos). */
  refresh: () => Promise<SessionStatus>;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// A sessão são os cookies HttpOnly (ADR 0011); `GET /me` diz se eles ainda valem.
async function probe(): Promise<SessionStatus> {
  try {
    await client.GET("/api/v1/me");
    return "authenticated";
  } catch (error) {
    return error instanceof ApiError && error.code === "CONSENT_REQUIRED" ? "consent" : "anonymous";
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>("loading");

  const signOut = useCallback(() => {
    setStatus("anonymous");
    // Nada do usuário anterior pode sobrar no cache.
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    const next = await probe();
    setStatus(next);
    return next;
  }, []);

  // Layout effect: roda antes dos efeitos das queries filhas.
  useLayoutEffect(() => {
    configureSession({ onExpired: signOut, onConsentRequired: () => setStatus("consent") });
    return () => configureSession(null);
  }, [signOut]);

  useEffect(() => {
    let active = true;
    void probe().then((next) => active && setStatus(next));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ status, refresh, signOut }), [status, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession precisa estar dentro de SessionProvider.");
  return value;
}
