import { Navigate, Outlet, useLocation } from "react-router";
import { useSession, type Role } from "./session-context";

function Loading() {
  return (
    <p role="status" aria-busy="true">
      Carregando…
    </p>
  );
}

/** Área inicial de cada papel (Q3). */
export function roleHome(role: Role | undefined): string {
  return role === "ADMIN" ? "/admin" : "/";
}

/** Só caminhos do próprio portal: evita redirecionar para fora por um endereço montado. */
function safeDestination(state: unknown, role: Role | undefined): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
    ? from
    : roleHome(role);
}

export function RequireSession() {
  const { status } = useSession();
  const location = useLocation();
  if (status === "loading") return <Loading />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (status === "password") return <Navigate to="/definir-senha" replace state={location.state} />;
  if (status === "consent") return <Navigate to="/termos" replace state={location.state} />;
  return <Outlet />;
}

/**
 * Guarda de papel, para dentro de `RequireSession`: quem abre a área de outro papel vai para a
 * própria, sem tela de erro (Q3).
 */
export function RequireRole({ allow }: { allow: Role }) {
  const session = useSession();
  if (session.status === "loading") return <Loading />;
  if (session.role !== allow) return <Navigate to={roleHome(session.role)} replace />;
  return <Outlet />;
}

export function RedirectIfSession() {
  const { status, role } = useSession();
  const location = useLocation();
  if (status === "loading") return <Loading />;
  if (status === "authenticated") {
    return <Navigate to={safeDestination(location.state, role)} replace />;
  }
  if (status === "password") return <Navigate to="/definir-senha" replace state={location.state} />;
  if (status === "consent") return <Navigate to="/termos" replace state={location.state} />;
  return <Outlet />;
}

/** A tela de definir senha só existe enquanto a senha temporária está pendente. */
export function RequirePasswordSetup() {
  const { status, role } = useSession();
  const location = useLocation();
  if (status === "loading") return <Loading />;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  if (status === "consent") return <Navigate to="/termos" replace state={location.state} />;
  if (status === "authenticated") {
    return <Navigate to={safeDestination(location.state, role)} replace />;
  }
  return <Outlet />;
}

/** A tela de termos só existe enquanto o aceite está pendente. */
export function RequireConsent() {
  const { status, role } = useSession();
  const location = useLocation();
  if (status === "loading") return <Loading />;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  if (status === "password") return <Navigate to="/definir-senha" replace state={location.state} />;
  if (status === "authenticated") {
    return <Navigate to={safeDestination(location.state, role)} replace />;
  }
  return <Outlet />;
}
