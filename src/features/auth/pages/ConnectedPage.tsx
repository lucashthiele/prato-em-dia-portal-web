import { Button } from "../../../shared/ui";
import { useLogout } from "../api/auth";
import styles from "./AuthPages.module.css";

// Tela temporária do setup (LUC-13): confirma a sessão e permite sair. Será substituída pelo Início.
export function ConnectedPage() {
  const logout = useLogout();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <img className={styles.logo} src="/prato_em_dia_logo.png" alt="Prato em Dia" />
        <h1 className={styles.title}>Você está conectado</h1>
        <p className={styles.lead}>O portal conseguiu falar com o servidor e iniciar sua sessão.</p>
        <Button
          variant="outline"
          icon="logout"
          loading={logout.isPending}
          onClick={() => logout.mutate()}
        >
          Sair
        </Button>
      </div>
    </main>
  );
}
