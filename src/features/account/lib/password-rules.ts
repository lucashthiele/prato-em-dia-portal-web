export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 72;
export const PASSWORD_HELP = `Use de ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres.`;

export interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
}

export type PasswordErrors = Partial<Record<keyof PasswordValues, string>>;

/** Regras do cliente; o servidor valida de novo. */
export function validatePassword(values: PasswordValues, currentLabel: string): PasswordErrors {
  const errors: PasswordErrors = {};
  if (!values.currentPassword) errors.currentPassword = `Informe ${currentLabel}.`;
  if (values.newPassword.length < PASSWORD_MIN || values.newPassword.length > PASSWORD_MAX) {
    errors.newPassword = PASSWORD_HELP;
  }
  if (!values.confirmation) errors.confirmation = "Confirme a nova senha.";
  else if (values.confirmation !== values.newPassword) {
    errors.confirmation = "A confirmação é diferente da nova senha.";
  }
  return errors;
}
