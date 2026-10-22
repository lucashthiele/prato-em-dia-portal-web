import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { configureSession } from "../../shared/api";
import { clearSession, readSession, writeSession, type StoredSession } from "./session-storage";

interface SessionContextValue {
  session: StoredSession | null;
  signIn: (session: StoredSession) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(readSession);

  const signIn = useCallback((next: StoredSession) => {
    writeSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // Layout effect: roda antes dos efeitos das queries filhas, que já precisam do token.
  useLayoutEffect(() => {
    configureSession({ getTokens: readSession, onRefreshed: signIn, onExpired: signOut });
    return () => configureSession(null);
  }, [signIn, signOut]);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession precisa estar dentro de SessionProvider.");
  return value;
}
