import { useSession } from "../../auth";
import { PasswordForm } from "../components/PasswordForm";
import styles from "./AccountPages.module.css";

/**
 * Primeiro acesso (Q2): fora do Shell, no layout do login. Sem senha temporária: o servidor a
 * dispensa enquanto a conta usa a senha inicial (S-01).
 */
export function SetPasswordPage() {
  const { refresh } = useSession();
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img className={styles.brandMark} src="/prato_em_dia_logo.png" alt="" />
          <div>
            <div className={styles.brandName}>Prato em Dia</div>
            <div className={styles.brandSub}>Portal Pro Nutri</div>
          </div>
        </div>
        <div>
          <h1 className={styles.heading}>Definir senha</h1>
          <p className={styles.subhead}>
            Crie uma senha só sua para continuar. Ela substitui a senha temporária que você recebeu.
          </p>
        </div>
        {/* Depois da troca, a sessão é consultada de novo: termos pendentes ou área do papel. */}
        <PasswordForm mode="first" submitLabel="Definir senha" onSuccess={() => void refresh()} />
      </div>
    </main>
  );
}
