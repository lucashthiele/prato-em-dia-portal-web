import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";

export type Profile = components["schemas"]["CurrentProfileResponse"];

interface ProfileChanges {
  fullName: string;
  phone?: string;
  registrationNumber?: string;
  bio?: string;
}

/** `PUT /me` substitui o perfil: a data de nascimento já salva volta no corpo para não se perder. */
export function useUpdateProfile(current: Profile | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: ProfileChanges) => {
      const { data } = await client.PUT("/api/v1/me", {
        body: { ...changes, birthDate: current?.birthDate },
      });
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}
