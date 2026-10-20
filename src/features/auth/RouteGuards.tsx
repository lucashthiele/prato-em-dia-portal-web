import { Navigate, Outlet } from "react-router";
import { useSession } from "./session-context";

export function RequireSession() {
  const { session } = useSession();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

export function RedirectIfSession() {
  const { session } = useSession();
  return session ? <Navigate to="/" replace /> : <Outlet />;
}
