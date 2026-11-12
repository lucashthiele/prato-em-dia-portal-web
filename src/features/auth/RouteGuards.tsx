import { Navigate, Outlet, useLocation } from "react-router";
import { useSession } from "./session-context";

function Loading() {
  return (
    <p role="status" aria-busy="true">
      Carregando…
    </p>
  );
}

/** Só caminhos do próprio portal: evita redirecionar para fora por um endereço montado. */
function safeDestination(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/";
}

export function RequireSession() {
  const { status } = useSession();
  const location = useLocation();
  if (status === "loading") return <Loading />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (status === "consent") return <Navigate to="/termos" replace state={location.state} />;
  return <Outlet />;
}

export function RedirectIfSession() {
  const { status } = useSession();
  const location = useLocation();
  if (status === "loading") return <Loading />;
  if (status === "authenticated") return <Navigate to={safeDestination(location.state)} replace />;
  if (status === "consent") return <Navigate to="/termos" replace state={location.state} />;
  return <Outlet />;
}

/** A tela de termos só existe enquanto o aceite está pendente. */
export function RequireConsent() {
  const { status } = useSession();
  const location = useLocation();
  if (status === "loading") return <Loading />;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  if (status === "authenticated") return <Navigate to={safeDestination(location.state)} replace />;
  return <Outlet />;
}
