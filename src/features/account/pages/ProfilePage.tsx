import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, TextField } from "../../../shared/ui";
import { useLogout, useMe } from "../../auth";
import { useUpdateProfile, type Profile } from "../api/profile";
import styles from "./AccountPages.module.css";

const PRIVATE_HINT = "Por enquanto, só você vê estas informações.";

function fieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.fieldErrors.find((item) => item.field === field)?.message;
}

interface ProfilePageProps {
  /** Admin: só o e-mail (somente leitura), "Alterar senha" e "Sair"; a conta não tem perfil. */
  variant?: "nutritionist" | "admin";
  changePasswordPath?: string;
}

function ProfileForm({
  profile,
  variant,
  changePasswordPath,
}: Required<ProfilePageProps> & { profile: Profile }) {
  const update = useUpdateProfile(profile);
  const logout = useLogout();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    fullName: profile.fullName ?? "",
    phone: profile.phone ?? "",
    registrationNumber: profile.registrationNumber ?? "",
    bio: profile.bio ?? "",
  });
  const [nameError, setNameError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const isNutritionist = variant === "nutritionist";

  function set(field: keyof typeof values) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSaved(false);
      setValues((previous) => ({ ...previous, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const fullName = values.fullName.trim();
    if (!fullName) {
      setNameError("Informe seu nome.");
      return;
    }
    setNameError(undefined);
    update.mutate(
      {
        fullName,
        // Admin só edita o nome: o resto do perfil segue como está no servidor.
        phone: isNutritionist ? values.phone.trim() : profile.phone,
        registrationNumber: isNutritionist
          ? values.registrationNumber.trim()
          : profile.registrationNumber,
        bio: isNutritionist ? values.bio.trim() : profile.bio,
      },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <form className={styles.section} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.heading}>Perfil e conta</h1>
      {saved ? <Alert tone="success">Perfil salvo.</Alert> : null}
      {update.isError ? (
        <Alert tone="danger">Não foi possível salvar agora. Tente de novo em instantes.</Alert>
      ) : null}
      {/* Conta ADMIN não tem perfil no servidor: só o e-mail, sem nome para editar. */}
      {isNutritionist ? (
        <TextField
          label="Nome"
          autoComplete="name"
          value={values.fullName}
          onChange={set("fullName")}
          error={nameError ?? fieldError(update.error, "fullName")}
        />
      ) : null}
      <TextField
        label="E-mail"
        type="email"
        value={profile.email ?? ""}
        readOnly
        disabled
        hint="Não pode ser alterado."
      />
      {isNutritionist ? (
        <>
          <TextField
            label="Telefone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={set("phone")}
            hint={PRIVATE_HINT}
            error={fieldError(update.error, "phone")}
          />
          <TextField
            label="Registro profissional"
            value={values.registrationNumber}
            onChange={set("registrationNumber")}
            error={fieldError(update.error, "registrationNumber")}
          />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="perfil-bio">
              Bio
            </label>
            <textarea
              id="perfil-bio"
              className={styles.textarea}
              value={values.bio}
              onChange={set("bio")}
            />
            <p className={styles.hint}>{PRIVATE_HINT}</p>
          </div>
        </>
      ) : null}
      <div className={styles.actions}>
        {isNutritionist ? (
          <Button type="submit" loading={update.isPending}>
            Salvar perfil
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => void navigate(changePasswordPath)}>
          Alterar senha
        </Button>
        <Button variant="ghost" onClick={() => logout.mutate()}>
          Sair
        </Button>
      </div>
    </form>
  );
}

function ProfileLoader(props: Required<ProfilePageProps>) {
  const me = useMe();
  if (me.isPending) {
    return (
      <p role="status" aria-busy="true">
        Carregando…
      </p>
    );
  }
  if (me.isError) {
    return (
      <Alert
        tone="danger"
        title="Não foi possível carregar o perfil"
        action={
          <Button size="sm" variant="outline" onClick={() => void me.refetch()}>
            Tentar de novo
          </Button>
        }
      >
        Tente novamente em instantes.
      </Alert>
    );
  }
  return <ProfileForm {...props} profile={me.data ?? {}} />;
}

/** Perfil do nutricionista (Q25), em `/perfil`. */
export function ProfilePage({
  changePasswordPath = "/perfil/senha",
}: Pick<ProfilePageProps, "changePasswordPath">) {
  return <ProfileLoader variant="nutritionist" changePasswordPath={changePasswordPath} />;
}

/** Perfil do admin (Q24): o worker da área admin monta esta página na rota dele. */
export function AdminProfilePage({ changePasswordPath }: { changePasswordPath: string }) {
  return <ProfileLoader variant="admin" changePasswordPath={changePasswordPath} />;
}
