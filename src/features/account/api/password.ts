import { useMutation } from "@tanstack/react-query";
import { client } from "../../../shared/api";

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/** Troca a senha; o servidor revoga as outras sessões e renova os cookies desta. */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: PasswordChange) => {
      const { data } = await client.PATCH("/api/v1/me/password", { body });
      return data;
    },
  });
}
