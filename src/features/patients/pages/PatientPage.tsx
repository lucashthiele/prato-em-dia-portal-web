import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ApiError } from "../../../shared/api";
import {
  ActionMenu,
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  PatientHeader,
  Tabs,
} from "../../../shared/ui";
import { PrescriptionPanel } from "../../prescriptions";
import { useEndRelationship, usePatient } from "../api/patient";
import { useResendAccess } from "../api/patients";
import { deliveryStatus } from "../lib/patients";
import styles from "./PatientPage.module.css";

const TABS = [
  { id: "prescricao", label: "Prescrição" },
  { id: "acompanhamento", label: "Acompanhamento" },
];

type Dialog = "resend" | "end" | null;

export function PatientPage() {
  const { patientId = "" } = useParams();
  // `key` zera o estado local ao trocar de paciente: nunca mostra dados do anterior.
  return <PatientScreen key={patientId} patientId={patientId} />;
}

function PatientScreen({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const patient = usePatient(patientId);
  const resend = useResendAccess();
  const end = useEndRelationship();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [resent, setResent] = useState(false);

  const tab = TABS.some((t) => t.id === params.get("aba")) ? params.get("aba")! : "prescricao";

  if (patient.isPending) {
    return (
      <p role="status" aria-busy="true" className={styles.muted}>
        Carregando paciente…
      </p>
    );
  }

  if (patient.isError || !patient.data) {
    // 400 cobre um id que nem é UUID (endereço digitado à mão).
    const notFound = patient.error instanceof ApiError && [400, 404].includes(patient.error.status);
    return notFound ? (
      <EmptyState
        title="Paciente não encontrado"
        icon="search"
        action={
          <Button variant="outline" onClick={() => navigate("/pacientes")}>
            Voltar para Pacientes
          </Button>
        }
      >
        Este paciente não existe ou não está mais vinculado a você.
      </EmptyState>
    ) : (
      <Alert
        tone="danger"
        title="Não foi possível carregar o paciente"
        action={
          <Button size="sm" variant="outline" onClick={() => patient.refetch()}>
            Tentar de novo
          </Button>
        }
      >
        {patient.error instanceof ApiError && patient.error.status === 0
          ? "Não foi possível falar com o servidor."
          : "Tente novamente em instantes."}
      </Alert>
    );
  }

  const data = patient.data;
  const ended = data.relationshipStatus === "ENDED";
  const delivery = deliveryStatus(data);
  const access =
    delivery === "pending" || delivery === "sent" || delivery === "failed" ? delivery : undefined;
  const canResend = !ended && (access === "pending" || access === "failed");
  const name = data.patientFullName ?? "Paciente";

  function confirmResend() {
    resend.mutate(patientId, {
      onSuccess: () => setResent(true),
      onSettled: () => setDialog(null),
    });
  }

  function confirmEnd() {
    end.mutate(patientId, {
      onSuccess: () => navigate("/pacientes"),
      onSettled: () => setDialog(null),
    });
  }

  return (
    <div className={styles.page}>
      <nav aria-label="Navegação estrutural">
        <Link className={styles.back} to="/pacientes">
          Pacientes
        </Link>
      </nav>

      <PatientHeader
        name={name}
        email={data.patientEmail ?? ""}
        linkStatus={ended ? "ended" : "active"}
        accessStatus={access}
        actions={
          ended ? null : (
            <>
              {canResend ? (
                <Button
                  variant="outline"
                  icon="mail"
                  onClick={() => {
                    setResent(false);
                    resend.reset();
                    setDialog("resend");
                  }}
                >
                  Reenviar acesso
                </Button>
              ) : null}
              <Button
                icon="plus"
                onClick={() => navigate(`/pacientes/${patientId}/prescricao/nova`)}
              >
                Nova versão
              </Button>
              <ActionMenu
                label="Mais ações"
                items={[
                  {
                    label: "Encerrar vínculo",
                    icon: "x",
                    tone: "danger",
                    onSelect: () => {
                      end.reset();
                      setDialog("end");
                    },
                  },
                ]}
              />
            </>
          )
        }
      />

      {resent ? (
        <Alert tone="success">Acesso reenviado para {name}.</Alert>
      ) : resend.isError ? (
        <Alert tone="danger" title="Não foi possível reenviar o acesso">
          Tente novamente em instantes.
        </Alert>
      ) : end.isError ? (
        <Alert tone="danger" title="Não foi possível encerrar o vínculo">
          Tente novamente em instantes.
        </Alert>
      ) : null}

      <Tabs
        label="Paciente"
        items={TABS}
        value={tab}
        onChange={(id) => setParams(id === "prescricao" ? {} : { aba: id }, { replace: true })}
      />

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "prescricao" ? (
          ended ? (
            <EmptyState title="Vínculo encerrado" icon="history">
              Você não acessa mais a prescrição deste paciente.
            </EmptyState>
          ) : (
            <PrescriptionPanel patientId={patientId} />
          )
        ) : (
          <EmptyState title="Acompanhamento da semana" icon="clock">
            A semana registrada no app ainda não está disponível no portal.
          </EmptyState>
        )}
      </div>

      <ConfirmDialog
        open={dialog === "resend"}
        title="Reenviar acesso?"
        confirmLabel="Reenviar acesso"
        loading={resend.isPending}
        onConfirm={confirmResend}
        onCancel={() => setDialog(null)}
      >
        <p>Vamos enviar de novo as instruções de acesso ao app para {data.patientEmail}.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "end"}
        title="Encerrar vínculo?"
        confirmLabel="Encerrar vínculo"
        tone="danger"
        loading={end.isPending}
        onConfirm={confirmEnd}
        onCancel={() => setDialog(null)}
      >
        <p>
          Você deixa de ver a prescrição e o acompanhamento de {name}. Essa ação não pode ser
          desfeita.
        </p>
      </ConfirmDialog>
    </div>
  );
}
