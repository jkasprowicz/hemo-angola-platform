import type { ApiSessionResponse } from "../../types/api";
import type { BootstrapPayload } from "../../types/submission";
import { deleteMetaValue, getMetaValue, setMetaValue } from "../../lib/storage/indexedDb";


const SESSION_KEY = "auth.session";
const BOOTSTRAP_KEY = "auth.bootstrap";

export const authLocalRepository = {
  async getSession() {
    return getMetaValue<ApiSessionResponse>(SESSION_KEY);
  },

  async setSession(session: ApiSessionResponse) {
    await setMetaValue(SESSION_KEY, session);
  },

  async clearSession() {
    await deleteMetaValue(SESSION_KEY);
  },

  async getBootstrap() {
    return getMetaValue<BootstrapPayload>(BOOTSTRAP_KEY);
  },

  async setBootstrap(bootstrap: BootstrapPayload) {
    await setMetaValue(BOOTSTRAP_KEY, bootstrap);
  },

  async clearBootstrap() {
    await deleteMetaValue(BOOTSTRAP_KEY);
  },

  async clearAuthContext() {
    await Promise.all([this.clearSession(), this.clearBootstrap()]);
  },
};
