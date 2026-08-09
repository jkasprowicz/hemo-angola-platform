import { httpClient } from "../../lib/api/httpClient";
import type { ApiSessionResponse } from "../../types/api";
import type { BootstrapPayload } from "../../types/submission";
import { authLocalRepository } from "../local/authLocalRepository";


function isOfflineFallbackAllowed(error: unknown) {
  if (!navigator.onLine) {
    return true;
  }

  return error instanceof TypeError;
}


export const authRemoteRepository = {
  async ensureCsrf() {
    return httpClient.get("/api/auth/csrf/");
  },

  async login(username: string, password: string) {
    await this.ensureCsrf();
    return httpClient.post("/api/auth/login/", { username, password });
  },

  async logout() {
    await this.ensureCsrf();
    const response = await httpClient.post("/api/auth/logout/", {});
    await authLocalRepository.clearAuthContext();
    return response;
  },

  async getSession() {
    try {
      const session = await httpClient.get<ApiSessionResponse>("/api/auth/session/");
      if (session.authenticated) {
        await authLocalRepository.setSession(session);
      } else {
        await authLocalRepository.clearAuthContext();
      }
      return session;
    } catch (error) {
      if (!isOfflineFallbackAllowed(error)) {
        throw error;
      }

      const cachedSession = await authLocalRepository.getSession();
      if (cachedSession?.authenticated) {
        return cachedSession;
      }

      throw error;
    }
  },

  async getBootstrap() {
    try {
      const bootstrap = await httpClient.get<BootstrapPayload>("/api/bootstrap/");
      await authLocalRepository.setBootstrap(bootstrap);
      return bootstrap;
    } catch (error) {
      if (!isOfflineFallbackAllowed(error)) {
        throw error;
      }

      const cachedBootstrap = await authLocalRepository.getBootstrap();
      if (cachedBootstrap) {
        return cachedBootstrap;
      }

      throw error;
    }
  },
};
