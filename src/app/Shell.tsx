import { Outlet, useLocation } from "react-router";
import { useLogout, useMe } from "../features/auth";
import { SideNav } from "../shared/ui";
import styles from "./Shell.module.css";

const ITEMS = [
  { id: "home", label: "Início", icon: "home", href: "/" },
  { id: "patients", label: "Pacientes", icon: "users", href: "/pacientes" },
  { id: "profile", label: "Perfil e conta", icon: "user", href: "/perfil" },
] as const;

function currentArea(pathname: string) {
  if (pathname.startsWith("/pacientes")) return "patients";
  if (pathname.startsWith("/perfil")) return "profile";
  return "home";
}

export function Shell() {
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
