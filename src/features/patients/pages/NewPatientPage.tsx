import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Alert, Button, TextField } from "../../../shared/ui";
import { useCreatePatient } from "../api/create-patient";
import { createFailure, validateNewPatient, type NewPatientErrors } from "../lib/new-patient";
import styles from "./NewPatientPage.module.css";

export function NewPatientPage() {
  const navigate = useNavigate();
  const create = useCreatePatient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [clientErrors, setClientErrors] = useState<NewPatientErrors>({});

  const failure = create.isError ? createFailure(create.error) : null;
  const errors = { ...failure?.errors, ...clientErrors };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateNewPatient({ fullName, email });
    setClientErrors(found);
    if (Object.keys(found).length > 0) return;
    create.mutate(
      { fullName: fullName.trim(), email: email.trim() },
      {
        onSuccess: (created) =>
          navigate(created?.patientId ? `/pacientes/${created.patientId}` : "/pacientes", {
            state: { accessEmailAlert: true },
          }),
      },
    );
  }

  return (
    <div className={styles.page}>
      <nav aria-label="Navegação estrutural">
        <Link className={styles.back} to="/pacientes">
          Pacientes
        </Link>
      </nav>
      <div>
        <h1 className={styles.title}>Adicionar paciente</h1>
        <p className={styles.muted}>
          Vamos enviar ao paciente um e-mail com as instruções de acesso ao app.
        </p>
      </div>
      {failure?.banner ? <Alert tone="danger">{failure.banner}</Alert> : null}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nome completo"
          autoComplete="off"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            setClientErrors((prev) => ({ ...prev, fullName: undefined }));
            create.reset();
          }}
          error={errors.fullName}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setClientErrors((prev) => ({ ...prev, email: undefined }));
            create.reset();
          }}
          error={errors.email}
        />
        <div className={styles.actions}>
          <Button type="submit" loading={create.isPending}>
            Cadastrar paciente
          </Button>
          <Button variant="ghost" onClick={() => navigate("/pacientes")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
