import { useMutation, useQuery } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";
import { useSession } from "../session-context";

export type ConsentDocument = NonNullable<
  components["schemas"]["ConsentStatusResponse"]["documents"]
>[number];

export function useConsents() {
  return useQuery({
    queryKey: ["consents"],
    queryFn: async () => {
      const { data } = await client.GET("/api/v1/me/consents");
      return data?.documents ?? [];
    },
  });
}

/** Aceita a versão vigente de cada documento ainda não aceito e libera o portal. */
export function useAcceptConsents() {
  const { refresh } = useSession();
  return useMutation({
    mutationFn: async (documents: ConsentDocument[]) => {
      for (const document of documents) {
        if (document.accepted || !document.documentType || !document.currentVersion) continue;
        await client.POST("/api/v1/me/consents", {
          body: { documentType: document.documentType, version: document.currentVersion },
        });
      }
    },
    onSuccess: () => refresh(),
  });
}
