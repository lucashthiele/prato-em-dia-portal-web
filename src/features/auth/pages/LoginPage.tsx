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
    if (error.status === 401) return "E-mail ou senha inválidos. Confira os dados e tente de novo.";
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
        <img className={styles.logo} src="/prato_em_dia_logo.png" alt="Prato em Dia" />
        <h1 className={styles.title}>Entrar no portal</h1>
        <p className={styles.lead}>Acompanhe seus pacientes e publique prescrições.</p>
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
          <Button type="submit" loading={login.isPending}>
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
