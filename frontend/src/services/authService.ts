import { authRemoteRepository } from "../repositories/remote/authRemoteRepository";


export const authService = {
  async login(username: string, password: string) {
    return authRemoteRepository.login(username, password);
  },
  async logout() {
    return authRemoteRepository.logout();
  },
  async getSession() {
    return authRemoteRepository.getSession();
  },
  async getBootstrap() {
    return authRemoteRepository.getBootstrap();
  },
};

