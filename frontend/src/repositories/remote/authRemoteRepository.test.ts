import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetIndexedDbForTests } from "../../lib/storage/indexedDb";
import type { ApiSessionResponse } from "../../types/api";
import type { BootstrapPayload } from "../../types/submission";
import { authLocalRepository } from "../local/authLocalRepository";


const mockHttpClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../lib/api/httpClient", () => ({
  httpClient: mockHttpClient,
}));

const { authRemoteRepository } = await import("./authRemoteRepository");

const authenticatedSession: ApiSessionResponse = {
  authenticated: true,
  user: {
    username: "operador",
    full_name: "Operator Demo",
    role: "operator",
  },
};

const bootstrapPayload: BootstrapPayload = {
  institution: { id: 1, name: "Instituição Demonstrativa HEMO-ANGOLA" },
  unit: { id: 1, name: "Unidade Demonstrativa", code: "DEMO-UNIT-01" },
  reportingPeriod: {
    id: 8,
    label: "Agosto/2026",
    reference_year: 2026,
    reference_month: 8,
    start_date: "2026-08-01",
    end_date: "2026-08-31",
    status: "open",
  },
  reportingPeriods: [
    { id: 12, label: "Dezembro/2026", reference_year: 2026, reference_month: 12, start_date: "2026-12-01", end_date: "2026-12-31", status: "open" },
    { id: 11, label: "Novembro/2026", reference_year: 2026, reference_month: 11, start_date: "2026-11-01", end_date: "2026-11-30", status: "open" },
    { id: 10, label: "Outubro/2026", reference_year: 2026, reference_month: 10, start_date: "2026-10-01", end_date: "2026-10-31", status: "open" },
    { id: 9, label: "Setembro/2026", reference_year: 2026, reference_month: 9, start_date: "2026-09-01", end_date: "2026-09-30", status: "open" },
    { id: 8, label: "Agosto/2026", reference_year: 2026, reference_month: 8, start_date: "2026-08-01", end_date: "2026-08-31", status: "open" },
    { id: 7, label: "Julho/2026", reference_year: 2026, reference_month: 7, start_date: "2026-07-01", end_date: "2026-07-31", status: "closed" },
    { id: 6, label: "Junho/2026", reference_year: 2026, reference_month: 6, start_date: "2026-06-01", end_date: "2026-06-30", status: "closed" },
    { id: 5, label: "Maio/2026", reference_year: 2026, reference_month: 5, start_date: "2026-05-01", end_date: "2026-05-31", status: "closed" },
    { id: 4, label: "Abril/2026", reference_year: 2026, reference_month: 4, start_date: "2026-04-01", end_date: "2026-04-30", status: "closed" },
    { id: 3, label: "Marco/2026", reference_year: 2026, reference_month: 3, start_date: "2026-03-01", end_date: "2026-03-31", status: "closed" },
    { id: 2, label: "Fevereiro/2026", reference_year: 2026, reference_month: 2, start_date: "2026-02-01", end_date: "2026-02-28", status: "closed" },
    { id: 1, label: "Janeiro/2026", reference_year: 2026, reference_month: 1, start_date: "2026-01-01", end_date: "2026-01-31", status: "closed" },
  ],
  reportingPeriodPolicy: {
    minDate: "2024-08-01",
    maxDate: "2026-11-01",
  },
  catalog: {
    modules: [],
    variables: [],
    indicators: [],
  },
  user: {
    username: "operador",
    fullName: "Operator Demo",
    role: "operator",
  },
  demoNotice: "Configuração demonstrativa.",
};

describe("authRemoteRepository", () => {
  beforeEach(async () => {
    mockHttpClient.get.mockReset();
    mockHttpClient.post.mockReset();
    await resetIndexedDbForTests();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(async () => {
    await resetIndexedDbForTests();
  });

  it("caches authenticated session and bootstrap after successful remote fetches", async () => {
    mockHttpClient.get
      .mockResolvedValueOnce(authenticatedSession)
      .mockResolvedValueOnce(bootstrapPayload);

    await expect(authRemoteRepository.getSession()).resolves.toEqual(authenticatedSession);
    await expect(authRemoteRepository.getBootstrap()).resolves.toEqual(bootstrapPayload);

    await expect(authLocalRepository.getSession()).resolves.toEqual(authenticatedSession);
    await expect(authLocalRepository.getBootstrap()).resolves.toEqual(bootstrapPayload);
  });

  it("returns cached auth context when offline and remote requests fail", async () => {
    await authLocalRepository.setSession(authenticatedSession);
    await authLocalRepository.setBootstrap(bootstrapPayload);
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    mockHttpClient.get.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(authRemoteRepository.getSession()).resolves.toEqual(authenticatedSession);
    await expect(authRemoteRepository.getBootstrap()).resolves.toEqual(bootstrapPayload);
  });

  it("clears cached auth context after a successful logout", async () => {
    await authLocalRepository.setSession(authenticatedSession);
    await authLocalRepository.setBootstrap(bootstrapPayload);
    mockHttpClient.get.mockResolvedValue(undefined);
    mockHttpClient.post.mockResolvedValue({ detail: "Sessão encerrada com sucesso." });

    await expect(authRemoteRepository.logout()).resolves.toEqual({ detail: "Sessão encerrada com sucesso." });
    await expect(authLocalRepository.getSession()).resolves.toBeUndefined();
    await expect(authLocalRepository.getBootstrap()).resolves.toBeUndefined();
  });
});
