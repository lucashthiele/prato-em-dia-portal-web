import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, ConfirmDialog, EmptyState, StatusChip } from "../../../shared/ui";
import { useMe } from "../../auth";
import { useChangeStatus, useResendAccessEmail, useUser, type AdminUser } from "../api/users";
import {
  accessEmailStatus,
  accountChip,
  firstName,
  isActive,
  roleLabel,
  type AccessEmail,
} from "../lib/labels";
import styles from "./Page.module.css";

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export function UserDetailPage() {
  const { id = "" } = useParams();
  // `key` zera o estado local ao trocar de usuário: nunca mostra dados do anterior.
  return <UserScreen key={id} id={id} />;
}

type Dialog = "status" | null;

function UserScreen({ id }: { id: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const me = useMe();
  const user = useUser(id);
  const resend = useResendAccessEmail();
  const change = useChangeStatus();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [resent, setResent] = useState(false);
  const created = (location.state as { created?: boolean } | null)?.created === true;

  if (user.isPending) {
    return (
      <p role="status" aria-busy="true" className={styles.muted}>
        Carregando usuário…
      </p>
    );
  }

  if (user.isError || !user.data) {
    // 400 cobre um id que nem é UUID (endereço digitado à mão).
    const notFound = user.error instanceof ApiError && [400, 404].includes(user.error.status);
    return notFound || (!user.isError && !user.data) ? (
      <EmptyState
        title="Usuário não encontrado"
        icon="search"
        action={
          <Button variant="outline" onClick={() => navigate("/admin/usuarios")}>
            Voltar para Usuários
          </Button>
        }
      >
        Esta conta não existe ou o endereço está incorreto.
      </EmptyState>
    ) : (
      <Alert
        tone="danger"
        title="Não foi possível carregar o usuário"
        action={
          <Button size="sm" variant="outline" onClick={() => user.refetch()}>
            Tentar de novo
          </Button>
        }
      >
        {user.error instanceof ApiError && user.error.isNetworkError
          ? "Não foi possível falar com o servidor."
          : "Tente novamente em instantes."}
      </Alert>
    );
  }

  const data: AdminUser = user.data;
  const name = data.fullName ?? data.email ?? "Usuário";
  const active = isActive(data.status);
  const chip = accountChip(data.status);
  const isNutritionist = data.role === "NUTRITIONIST";
  const isSelf = me.data?.userAccountId !== undefined && me.data.userAccountId === data.id;
  const access = accessEmailStatus(data.accessEmail?.status);
  // O servidor só reenvia a nutricionista ativo que ainda não definiu a senha.
  const canResend = isNutritionist && active && data.passwordChangeRequired !== false;

  function confirmStatus(endRelationships = false) {
    change.mutate(
      { id, status: active ? "INACTIVE" : "ACTIVE", endRelationships },
      { onSettled: () => setDialog(null) },
    );
  }

  function resendEmail() {
    setResent(false);
    resend.mutate(id, { onSuccess: () => setResent(true) });
  }

  return (
    <div className={styles.page}>
      <nav aria-label="Navegação estrutural">
        <Link className={styles.back} to="/admin/usuarios">
          Usuários
        </Link>
      </nav>

      <header className={styles.header}>
        <div>
          <div className={styles.identity}>
            <h1 className={styles.title}>{name}</h1>
            <StatusChip status={chip.status} label={chip.label} />
          </div>
          <div className={styles.email}>{data.email}</div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.link} to={`/admin/auditoria?alvo=${id}`}>
            Ver na auditoria
          </Link>
          {isSelf ? null : (
            <Button
              variant={active ? "outline" : "primary"}
              onClick={() => {
                change.reset();
                setDialog("status");
              }}
            >
              {active ? "Desativar conta" : "Ativar conta"}
            </Button>
          )}
        </div>
      </header>

      {created ? <Alert tone="success">Nutricionista cadastrado.</Alert> : null}
      {resent ? <Alert tone="success">E-mail de acesso reenviado para {data.email}.</Alert> : null}
      {resend.isError ? (
        <Alert tone="danger" title="Não foi possível reenviar o e-mail">
          {resendErrorText(resend.error)}
        </Alert>
      ) : null}
      {change.isError ? (
        <Alert
          tone="danger"
          title={active ? "Não foi possível desativar a conta" : "Não foi possível ativar a conta"}
        >
          {changeErrorText(change.error)}
        </Alert>
      ) : null}

      {access ? (
        <AccessEmailAlert
          status={access}
          canResend={canResend}
          resending={resend.isPending}
          onResend={resendEmail}
        />
      ) : canResend ? (
        <div>
          <Button variant="outline" icon="mail" loading={resend.isPending} onClick={resendEmail}>
            Reenviar e-mail
          </Button>
        </div>
      ) : null}

      <section className={styles.card} aria-label="Dados da conta">
        <dl className={styles.facts}>
          <dt>Papel</dt>
          <dd>{roleLabel(data.role)}</dd>
          <dt>E-mail</dt>
          <dd>{data.email}</dd>
          {data.registrationNumber ? (
            <>
              <dt>Registro profissional</dt>
              <dd>{data.registrationNumber}</dd>
            </>
          ) : null}
          {data.createdAt ? (
            <>
              <dt>Criada em</dt>
              <dd>{date.format(new Date(data.createdAt))}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <StatusDialog
        open={dialog === "status"}
        user={data}
        name={name}
        loading={change.isPending}
        onConfirm={confirmStatus}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

function resendErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "Não foi possível falar com o servidor.";
    if (error.code === "ACCESS_EMAIL_NOT_AVAILABLE") {
      return "O reenvio só vale para nutricionista com conta ativa que ainda não definiu a senha.";
    }
  }
  return "Tente novamente em instantes.";
}

function changeErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "Não foi possível falar com o servidor.";
    if (error.code === "ADMIN_CANNOT_CHANGE_OWN_STATUS") {
      return "Você não pode alterar a situação da sua própria conta.";
    }
    if (error.code === "END_RELATIONSHIPS_NOT_APPLICABLE") {
      return "Só é possível encerrar vínculos ao desativar um nutricionista. Atualize a página e tente de novo.";
    }
  }
  return "Tente novamente em instantes.";
}

const ACCESS_ALERT: Record<AccessEmail, { tone: "info" | "success" | "warm"; title: string }> = {
  pending: { tone: "info", title: "Envio pendente" },
  sent: { tone: "success", title: "Acesso enviado" },
  failed: { tone: "warm", title: "Falha no envio" },
};

function AccessEmailAlert({
  status,
  canResend,
  resending,
  onResend,
}: {
  status: AccessEmail;
  canResend: boolean;
  resending: boolean;
  onResend: () => void;
}) {
  const { tone, title } = ACCESS_ALERT[status];
  const text =
    status === "pending"
      ? "O e-mail de acesso está sendo enviado."
      : status === "sent"
        ? "O e-mail de acesso foi enviado."
        : "Não foi possível enviar o e-mail de acesso.";
  return (
    <Alert
      tone={tone}
      title={title}
      action={
        canResend ? (
          <Button size="sm" variant="outline" icon="mail" loading={resending} onClick={onResend}>
            Reenviar e-mail
          </Button>
        ) : undefined
      }
    >
      {text}
    </Alert>
  );
}

interface StatusDialogProps {
  open: boolean;
  user: AdminUser;
  name: string;
  loading: boolean;
  onConfirm: (endRelationships?: boolean) => void;
  onCancel: () => void;
}

/** Textos de Q22b (nutricionista, três ações; S-08) e Q23 (paciente). */
function StatusDialog({ open, user, name, loading, onConfirm, onCancel }: StatusDialogProps) {
  const first = firstName(user.fullName);
  const common = { open, loading, onConfirm: () => onConfirm(), onCancel };

  if (!isActive(user.status)) {
    return (
      <ConfirmDialog {...common} title={`Ativar a conta de ${name}?`} confirmLabel="Ativar conta">
        <p>{first} volta a poder entrar. O acesso e o histórico continuam como estavam.</p>
      </ConfirmDialog>
    );
  }

  if (user.role === "NUTRITIONIST") {
    return (
      <ConfirmDialog
        {...common}
        tone="danger"
        title={`Desativar ${name}?`}
        confirmLabel="Desativar e encerrar vínculos"
        onConfirm={() => onConfirm(true)}
        secondaryLabel="Somente desativar"
        onSecondary={() => onConfirm(false)}
        confirmHint={`Os vínculos com todos os pacientes de ${first} são encerrados e as prescrições dela são arquivadas. Os pacientes deixam de receber novos planos e ficam livres para ser cadastrados por outro nutricionista. O histórico de registros é mantido.`}
      >
        <p>{first} não poderá mais entrar no portal.</p>
      </ConfirmDialog>
    );
  }

  if (user.role === "PATIENT") {
    return (
      <ConfirmDialog
        {...common}
        tone="danger"
        title={`Desativar a conta de ${name}?`}
        confirmLabel="Desativar conta"
      >
        <p>
          {first} não poderá mais entrar no app. O vínculo com o nutricionista e o histórico de
          registros continuam. Para liberar {first} para outro nutricionista, o nutricionista atual
          deve encerrar o vínculo.
        </p>
      </ConfirmDialog>
    );
  }

  return (
    <ConfirmDialog
      {...common}
      tone="danger"
      title={`Desativar a conta de ${name}?`}
      confirmLabel="Desativar conta"
    >
      <p>{first} não poderá mais entrar no portal.</p>
    </ConfirmDialog>
  );
}
