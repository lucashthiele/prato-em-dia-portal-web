import { Alert, Button } from "../../../shared/ui";

export interface AccessEmailAlertProps {
  /** `emailDeliveryStatus` do vínculo (PENDING, SENT ou FAILED). */
  status: string | undefined;
  email: string;
  /** A consulta periódica parou e o envio ainda está pendente. */
  timedOut: boolean;
  resending: boolean;
  onResend: () => void;
}

/** Estado do e-mail de acesso logo após o cadastro (Q6). */
export function AccessEmailAlert({
  status,
  email,
  timedOut,
  resending,
  onResend,
}: AccessEmailAlertProps) {
  if (status === "SENT") {
    return <Alert tone="success">E-mail de acesso enviado para {email}.</Alert>;
  }
  if (status === "FAILED") {
    return (
      <Alert
        tone="warm"
        title="Não foi possível enviar o e-mail de acesso"
        action={
          <Button size="sm" variant="outline" loading={resending} onClick={onResend}>
            Reenviar e-mail
          </Button>
        }
      >
        O paciente ainda não recebeu as instruções para entrar no app.
      </Alert>
    );
  }
  if (status === "PENDING") {
    return (
      <Alert tone="info">
        {timedOut
          ? `O envio do e-mail de acesso para ${email} está demorando mais que o esperado. Atualize a página daqui a pouco.`
          : `Estamos enviando o e-mail de acesso para ${email}.`}
      </Alert>
    );
  }
  return null;
}
