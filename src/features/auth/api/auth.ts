import { useMutation } from "@tanstack/react-query";
import { client } from "../../../shared/api";
import { useSession } from "../session-context";

interface Credentials {
  email: string;
  password: string;
}

export function useLogin() {
  const { signIn } = useSession();
  return useMutation({
    mutationFn: async (credentials: Credentials) => {
      const { data } = await client.POST("/api/v1/auth/login", { body: credentials });
      if (!data?.accessToken || !data.refreshToken) {
        throw new Error("Resposta de login sem tokens.");
      }
      return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    },
    onSuccess: signIn,
  });
}

export function useLogout() {
  const { session, signOut } = useSession();
  return useMutation({
    mutationFn: async () => {
      // Revoga no servidor se der; a sessão local é encerrada de qualquer forma.
      if (!session) return;
      try {
        await client.POST("/api/v1/auth/logout", { body: { refreshToken: session.refreshToken } });
      } catch {
        // Falha de rede ou token já inválido: não prende o usuário na sessão.
      }
    },
    onSettled: signOut,
  });
}
