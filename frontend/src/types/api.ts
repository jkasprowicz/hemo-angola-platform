export type ApiSessionResponse =
  | { authenticated: false }
  | {
      authenticated: true;
      user: {
        username: string;
        full_name: string;
        role: string;
      };
    };

export type SyncResult = {
  localId: string;
  submissionUuid: string;
  versionNumber: number;
  status: "received" | "accepted";
  syncedAt: string | null;
  idempotent: boolean;
};

export type DashboardFilterPayload = {
  unit_id: number | null;
  period_from: number | null;
  period_to: number | null;
};

export type DashboardSummaryPayload = {
  collections_received: number;
  period_analyzed: string;
  last_updated: string | null;
  unit: {
    id: number | null;
    name: string;
  };
  workflow_note: string;
};

export type DashboardIndicatorBaseDatum = {
  label: string;
  field: string;
  value: number;
};

export type DashboardIndicatorPayload = {
  code: string;
  name: string;
  unit: string;
  value: number | null;
  reference_note: string;
  base_data: DashboardIndicatorBaseDatum[];
};

export type DashboardTraceRecord = {
  submission_id: number;
  submission_uuid: string;
  version_id: number;
  version_uuid: string;
  version_number: number;
  status: string;
  collection_date: string | null;
  closed_at?: string | null;
  submitted_at?: string | null;
  received_at: string;
  unit_id: number;
  reporting_period_id: number;
};

export type DashboardSeriesPoint = {
  reporting_period_id: number;
  label: string;
  reference_year: number;
  reference_month: number;
  value: number | null;
  base_data: DashboardIndicatorBaseDatum[];
  trace_records: DashboardTraceRecord[];
};

export type DashboardSeriesPayload = {
  indicator_code: string;
  indicator_name: string;
  unit: string;
  points: DashboardSeriesPoint[];
};

export type DashboardTableRowPayload = {
  reporting_period_id: number;
  label: string;
  reference_year: number;
  reference_month: number;
  donacoes_voluntarias: number;
  donacoes_reposicao: number;
  percentual_doacoes_voluntarias: number | null;
  candidatos_aptos: number;
  candidatos_inaptos: number;
  taxa_inaptidao_clinica: number | null;
  amostras_testadas: number;
  amostras_reagentes: number;
  taxa_reatividade: number | null;
  trace: {
    submission_count: number;
    last_updated: string | null;
    records: DashboardTraceRecord[];
  };
};

export type DashboardPayload = {
  filters: DashboardFilterPayload;
  summary: DashboardSummaryPayload;
  indicators: DashboardIndicatorPayload[];
  series: DashboardSeriesPayload[];
  table: DashboardTableRowPayload[];
  empty: boolean;
};
