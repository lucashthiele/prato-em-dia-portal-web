import { useMutation } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";

/** Troca a senha (`currentPassword` fica de fora no primeiro acesso, S-01); o servidor revoga as outras sessões e renova os cookies desta. */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: components["schemas"]["ChangePasswordRequest"]) => {
      const { data } = await client.PATCH("/api/v1/me/password", { body });
      return data;
    },
  });
}
