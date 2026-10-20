export interface FieldError {
  field: string;
  code: string;
  message: string;
}

interface ErrorBody {
  code?: string;
  message?: string;
  errors?: FieldError[];
}

/** Erro de API com a forma única que as features tratam: status, código e erros por campo. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];

  constructor(status: number, code: string, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** Falha antes de haver resposta (rede fora, proxy sem backend). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export const NETWORK_ERROR_CODE = "NETWORK_ERROR";

export async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.clone().json()) as ErrorBody;
  } catch {
    // Corpo vazio ou não JSON (por exemplo, erro do proxy): usa só o status.
  }
  return new ApiError(
    response.status,
    body.code ?? "UNKNOWN_ERROR",
    body.message ?? response.statusText,
    body.errors ?? [],
  );
}
