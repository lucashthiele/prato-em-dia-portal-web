import { useState, type FormEvent } from "react";
import { ApiError } from "../../../shared/api";
import { Alert, Button, TextField } from "../../../shared/ui";
import { useChangePassword } from "../api/password";
import { PASSWORD_HELP, validatePassword, type PasswordErrors } from "../lib/password-rules";
import styles from "./PasswordForm.module.css";

interface PasswordFormProps {
  /** `first`: primeiro acesso, sem senha atual (S-01). `change`: pede a senha atual. */
  mode: "first" | "change";
  onSuccess: () => void;
  submitLabel: string;
}

function serverErrors(error: unknown): PasswordErrors {
  if (!(error instanceof ApiError)) return {};
  const errors: PasswordErrors = {};
  for (const item of error.fieldErrors) {
    if (item.field === "currentPassword") errors.currentPassword = item.message;
    if (item.field === "newPassword") errors.newPassword = item.message;
  }
  if (error.code === "AUTH_INVALID_CREDENTIALS") {
    errors.currentPassword = "Senha atual incorreta.";
  }
  return errors;
}

export function PasswordForm({ mode, onSuccess, submitLabel }: PasswordFormProps) {
  const change = useChangePassword();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmation: "" });
  const [clientErrors, setClientErrors] = useState<PasswordErrors>({});
  const askCurrent = mode === "change";

  const fromServer = serverErrors(change.error);
  const errors = { ...fromServer, ...clientErrors };
  const hasFieldError = Object.keys(fromServer).length > 0;

  function set(field: keyof typeof values) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((previous) => ({ ...previous, [field]: event.target.value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validatePassword(values, askCurrent ? "a senha atual" : null);
    setClientErrors(found);
    if (Object.keys(found).length > 0) return;
    change.mutate(
      askCurrent
        ? { currentPassword: values.currentPassword, newPassword: values.newPassword }
        : { newPassword: values.newPassword },
      {
        onSuccess: () => {
          setValues({ currentPassword: "", newPassword: "", confirmation: "" });
          onSuccess();
        },
      },
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {change.isError && !hasFieldError ? (
        <Alert tone="danger">
          Não foi possível alterar a senha agora. Tente de novo em instantes.
        </Alert>
      ) : null}
      {askCurrent ? (
        <TextField
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={set("currentPassword")}
          error={errors.currentPassword}
        />
      ) : null}
      <TextField
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        value={values.newPassword}
        onChange={set("newPassword")}
        hint={PASSWORD_HELP}
        error={errors.newPassword}
      />
      <TextField
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        value={values.confirmation}
        onChange={set("confirmation")}
        error={errors.confirmation}
      />
      <Button type="submit" loading={change.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
