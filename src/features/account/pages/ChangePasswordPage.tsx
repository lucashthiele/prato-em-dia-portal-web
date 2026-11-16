import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button } from "../../../shared/ui";
import { PasswordForm } from "../components/PasswordForm";
import styles from "./AccountPages.module.css";

/** Alterar senha (Q26), dentro do Shell. Serve ao nutricionista e ao admin. */
export function ChangePasswordPage({ backTo = "/perfil" }: { backTo?: string }) {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  return (
    <section className={styles.section} aria-labelledby="alterar-senha">
      <h1 id="alterar-senha" className={styles.heading}>
        Alterar senha
      </h1>
      {done ? (
        <Alert tone="success">
          Senha alterada. Outros dispositivos conectados serão desconectados em até 15 minutos.
        </Alert>
      ) : null}
      <PasswordForm mode="change" submitLabel="Alterar senha" onSuccess={() => setDone(true)} />
      <div className={styles.actions}>
        <Button variant="ghost" onClick={() => void navigate(backTo)}>
          Voltar ao perfil
        </Button>
      </div>
    </section>
  );
}
