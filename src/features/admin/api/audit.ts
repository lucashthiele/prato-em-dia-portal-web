import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { components, paths } from "../../../shared/api";
import { client } from "../../../shared/api";

export type AuditEvent = components["schemas"]["AuditEventResponse"];
export type AuditQuery = NonNullable<
  paths["/api/v1/admin/audit-events"]["get"]["parameters"]["query"]
>;

export interface AuditPage {
  events: AuditEvent[];
  total: number;
  totalPages: number;
}

export function useAuditEvents(query: AuditQuery = {}) {
  return useQuery({
    queryKey: ["admin", "audit", query],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AuditPage> => {
      const { data } = await client.GET("/api/v1/admin/audit-events", { params: { query } });
      const events = data?.content ?? [];
      return {
        events,
        total: data?.totalElements ?? events.length,
        totalPages: data?.totalPages ?? 1,
      };
    },
  });
}
