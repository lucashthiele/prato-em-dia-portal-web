import { useMutation } from "@tanstack/react-query";
import { client } from "../../../shared/api";
import { useSession } from "../session-context";

interface Credentials {
  email: string;
  password: string;
}

export function useLogin() {
  const { refresh } = useSession();
  return useMutation({
    // Os cookies da sessão vêm na resposta; depois do login, `GET /me` diz se há termos pendentes.
    mutationFn: async (credentials: Credentials) => {
      await client.POST("/api/v1/auth/login", { body: credentials });
    },
    onSuccess: () => refresh(),
  });
}

export function useLogout() {
  const { signOut } = useSession();
  return useMutation({
    mutationFn: async () => {
      // Revoga no servidor se der; a sessão local é encerrada de qualquer forma.
      try {
        await client.POST("/api/v1/auth/logout");
      } catch {
        // Falha de rede ou sessão já inválida: não prende o usuário na sessão.
      }
    },
    onSettled: signOut,
  });
}
