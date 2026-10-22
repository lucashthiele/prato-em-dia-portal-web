import { useQuery } from "@tanstack/react-query";
import { client } from "../../../shared/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await client.GET("/api/v1/me");
      return data;
    },
  });
}
