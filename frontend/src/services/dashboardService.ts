import { dashboardRemoteRepository } from "../repositories/remote/dashboardRemoteRepository";


export const dashboardService = {
  async getDashboard(filters: {
    unitId?: number | null;
    periodFrom?: number | null;
    periodTo?: number | null;
  }) {
    return dashboardRemoteRepository.getDashboard(filters);
  },
};
