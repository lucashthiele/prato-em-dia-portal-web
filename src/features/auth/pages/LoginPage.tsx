import { useState, type FormEvent } from "react";
import { ApiError } from "../../../shared/api";
import { Alert, Button, TextField } from "../../../shared/ui";
import { useLogin } from "../api/auth";
import styles from "./AuthPages.module.css";

function fieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.fieldErrors.find((item) => item.field === field)?.message;
}

function bannerMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.";
    }
    // Credencial inválida: sem indicar se o e-mail existe.
    if (error.status === 401)
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
    if (error.status === 400) return "Revise os campos destacados e tente de novo.";
  }
  return "Não foi possível entrar agora. Tente de novo em instantes.";
}

export function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email: email.trim(), password });
  }

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
          <h1 className={styles.heading}>Entrar</h1>
          <p className={styles.subhead}>Acesse seus pacientes e prescrições.</p>
        </div>
        {login.isError ? <Alert tone="danger">{bannerMessage(login.error)}</Alert> : null}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldError(login.error, "email")}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldError(login.error, "password")}
          />
          <Button type="submit" fullWidth loading={login.isPending}>
            Entrar
          </Button>
        </form>
        <p className={styles.footnote}>
          Seu acesso é criado pela equipe do Prato em Dia. Se perdeu a senha, peça uma nova
          credencial à administração.
        </p>
      </div>
    </main>
  );
}
