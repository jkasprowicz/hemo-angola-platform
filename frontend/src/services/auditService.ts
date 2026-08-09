import { httpClient } from "../lib/api/httpClient";


export type AuditLogEvent = {
  id: string;
  timestamp: string;
  user_id: number | null;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  unit_id: number | null;
  reporting_period_id: number | null;
  correlation_id: string;
  source: string;
  metadata: Record<string, unknown>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

export const auditService = {
  async listEvents(filters?: { action?: string; period?: number }) {
    const params = new URLSearchParams();
    if (filters?.action) {
      params.set("action", filters.action);
    }
    if (filters?.period) {
      params.set("period", String(filters.period));
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return httpClient.get<{ events: AuditLogEvent[] }>(`/api/audit-events/${suffix}`);
  },
};
