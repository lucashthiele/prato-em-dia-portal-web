import { ApiError } from "../../../shared/api";

export interface NewPatientForm {
  fullName: string;
  email: string;
}

export type NewPatientField = keyof NewPatientForm;
export type NewPatientErrors = Partial<Record<NewPatientField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewPatient({ fullName, email }: NewPatientForm): NewPatientErrors {
  const errors: NewPatientErrors = {};
  if (!fullName.trim()) errors.fullName = "Informe o nome completo.";
  if (!email.trim()) errors.email = "Informe o e-mail.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Informe um e-mail válido.";
  return errors;
}

// Textos da decisão Q7: sem revelar o outro nutricionista nem o papel da conta.
const RELATIONSHIP_CONFLICT =
  "Este e-mail já está vinculado a outro nutricionista. Transferência não está disponível no piloto.";
const PATIENT_ACCOUNT_CONFLICT =
  "Este e-mail não pode ser usado para cadastrar um paciente. Confira o endereço ou fale com a administração do Prato em Dia.";

export const GENERIC_CREATE_ERROR =
  "Não foi possível cadastrar o paciente. Tente de novo em instantes.";

export interface CreateFailure {
  /** Campo que recebe a mensagem; sem campo, a mensagem vai num aviso no topo. */
  errors: NewPatientErrors;
  banner?: string;
  /** Paciente já vinculado (RELATIONSHIP_ALREADY_EXISTS): destino do link "Abrir paciente". */
  existingPatientId?: string;
}

export const ALREADY_YOURS = "Este paciente já está na sua lista.";
export const EMAIL_FAILED =
  "Não foi possível enviar o e-mail de acesso ao paciente. Tente de novo em instantes. Se o paciente já aparecer na sua lista, use “Reenviar acesso” na página dele.";

export function createFailure(error: unknown): CreateFailure {
  if (error instanceof ApiError) {
    if (error.code === "RELATIONSHIP_ALREADY_EXISTS") {
      const id = error.fieldErrors.find((item) => item.field === "patientId")?.message?.trim();
      return { errors: { email: ALREADY_YOURS }, existingPatientId: id || undefined };
    }
    if (error.code === "RELATIONSHIP_EMAIL_FAILED") return { errors: {}, banner: EMAIL_FAILED };
    if (error.code === "RELATIONSHIP_CONFLICT") return { errors: { email: RELATIONSHIP_CONFLICT } };
    if (error.code === "PATIENT_ACCOUNT_CONFLICT") {
      return { errors: { email: PATIENT_ACCOUNT_CONFLICT } };
    }
    if (error.isNetworkError) {
      return {
        errors: {},
        banner: "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.",
      };
    }
    if (error.status === 400) {
      const errors: NewPatientErrors = {};
      for (const item of error.fieldErrors) {
        if (item.field === "email") errors.email = item.message;
        if (item.field === "fullName") errors.fullName = item.message;
      }
      if (Object.keys(errors).length > 0) return { errors };
    }
  }
  return { errors: {}, banner: GENERIC_CREATE_ERROR };
}
