import { Outlet, useLocation } from "react-router";
import { useLogout, useMe } from "../../auth";
import { SideNav } from "../../../shared/ui";
import styles from "./AdminShell.module.css";

const ITEMS = [
  { id: "users", label: "Usuários", icon: "users", href: "/admin/usuarios" },
  { id: "audit", label: "Auditoria", icon: "history", href: "/admin/auditoria" },
  { id: "profile", label: "Perfil e conta", icon: "user", href: "/admin/perfil" },
] as const;

function currentArea(pathname: string) {
  if (pathname.startsWith("/admin/auditoria")) return "audit";
  if (pathname.startsWith("/admin/perfil")) return "profile";
  return "users";
}

/** Shell da área de administração: SideNav própria (Q24) e a mesma coluna de conteúdo. */
export function AdminShell() {
  const { pathname } = useLocation();
  const me = useMe();
  const logout = useLogout();

  return (
    <div className={styles.shell}>
      <SideNav
        logoSrc="/prato_em_dia_logo.png"
        items={[...ITEMS]}
        value={currentArea(pathname)}
        user={me.data?.fullName ? { name: me.data.fullName } : undefined}
        onLogout={() => logout.mutate()}
      />
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
