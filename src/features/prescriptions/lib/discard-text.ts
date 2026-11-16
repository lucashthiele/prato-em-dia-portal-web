import type { PrescriptionVersion } from "../api/prescriptions";

/** Texto do diálogo de descartar (Q15), conforme o que sobra para o paciente. */
export function discardText(versions: PrescriptionVersion[]): string {
  if (versions.length <= 1) {
    return "As alterações deste rascunho serão perdidas e a prescrição volta a não existir.";
  }
  if (versions.some((v) => v.status === "PUBLISHED")) {
    return "As alterações deste rascunho serão perdidas. A versão vigente continua com o paciente.";
  }
  return "As alterações deste rascunho serão perdidas.";
}
