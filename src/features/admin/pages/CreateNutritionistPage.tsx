import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, TextField } from "../../../shared/ui";
import { useCreateNutritionist } from "../api/users";
import styles from "./Page.module.css";

type Field = "fullName" | "email" | "registrationNumber";
type Errors = Partial<Record<Field, string>>;

const FIELDS: Field[] = ["fullName", "email", "registrationNumber"];
const EMAIL_IN_USE = "Já existe uma conta com este e-mail.";

function validate(fullName: string, email: string): Errors {
  const errors: Errors = {};
  if (!fullName) errors.fullName = "Informe o nome completo.";
  if (!email) errors.email = "Informe o e-mail.";
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Informe um e-mail válido.";
  return errors;
}

export function CreateNutritionistPage() {
  const navigate = useNavigate();
  const create = useCreateNutritionist();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = {
      fullName: fullName.trim(),
      email: email.trim(),
      ...(registrationNumber.trim() ? { registrationNumber: registrationNumber.trim() } : {}),
    };
    const found = validate(body.fullName, body.email);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;

    create.mutate(body, {
      onSuccess: (created) =>
        navigate(created?.id ? `/admin/usuarios/${created.id}` : "/admin/usuarios", {
          state: { created: true },
        }),
      onError: (error) => {
        if (error instanceof ApiError && error.code === "IDENTITY_ACCOUNT_ALREADY_EXISTS") {
          setErrors({ email: EMAIL_IN_USE });
        } else if (error instanceof ApiError && error.fieldErrors.length > 0) {
          const fromApi: Errors = {};
          for (const item of error.fieldErrors) {
            if (FIELDS.includes(item.field as Field)) fromApi[item.field as Field] = item.message;
          }
          setErrors(fromApi);
          if (Object.keys(fromApi).length === 0) setFailure("Confira os dados e tente de novo.");
        } else if (error instanceof ApiError && error.isNetworkError) {
          setFailure("Não foi possível falar com o servidor. Tente de novo.");
        } else {
          setFailure("Tente novamente em instantes.");
        }
      },
    });
  }

  return (
    <div className={styles.page}>
      <nav aria-label="Navegação estrutural">
        <Link className={styles.back} to="/admin/usuarios">
          Usuários
        </Link>
      </nav>
      <h1 className={styles.title}>Cadastrar nutricionista</h1>

      <form className={styles.form} onSubmit={submit} noValidate>
        {failure ? (
          <Alert tone="danger" title="Não foi possível cadastrar o nutricionista">
            {failure}
          </Alert>
        ) : null}
        <TextField
          label="Nome completo"
          autoComplete="off"
          maxLength={180}
          value={fullName}
          error={errors.fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="off"
          maxLength={180}
          hint="O acesso ao portal é enviado para este e-mail."
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Registro profissional (opcional)"
          autoComplete="off"
          maxLength={60}
          value={registrationNumber}
          error={errors.registrationNumber}
          onChange={(event) => setRegistrationNumber(event.target.value)}
        />
        <div className={styles.actions}>
          <Button type="submit" loading={create.isPending}>
            Cadastrar nutricionista
          </Button>
          <Button variant="ghost" onClick={() => navigate("/admin/usuarios")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
