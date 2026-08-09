import { httpClient } from "../../lib/api/httpClient";
import type { DashboardPayload } from "../../types/api";


type DashboardFilters = {
  unitId?: number | null;
  periodFrom?: number | null;
  periodTo?: number | null;
};


function buildQueryString(filters: DashboardFilters) {
  const params = new URLSearchParams();

  if (filters.unitId) {
    params.set("unit_id", String(filters.unitId));
  }
  if (filters.periodFrom) {
    params.set("period_from", String(filters.periodFrom));
  }
  if (filters.periodTo) {
    params.set("period_to", String(filters.periodTo));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}


export const dashboardRemoteRepository = {
  async getDashboard(filters: DashboardFilters) {
    return httpClient.get<DashboardPayload>(`/api/dashboard/${buildQueryString(filters)}`);
  },
};
