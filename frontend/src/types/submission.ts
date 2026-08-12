export type UserRole = "operator" | "reviewer" | "manager" | "admin" | "researcher";
export type DisplayRole = "Operador" | "Revisor" | "Gestor" | "Administrador" | "Pesquisador";

export type CollectionVariableType = "integer" | "decimal" | "text" | "select" | "boolean";
export type IndicatorDimension = "structure" | "process" | "result";
export type FormulaKind = "ratio_percentage" | "share_of_sum_percentage";
export type CatalogStatus =
  | "demonstrativo"
  | "candidato"
  | "validado_por_consenso"
  | "em_piloto"
  | "aprovado";
export type CollectionSectionLayout = "fields" | "matrix";
export type DerivedValueOperation = "sum";

export type CollectionStatus =
  | "in_progress"
  | "ready_for_review"
  | "closed"
  | "received"
  | "accepted"
  | "rejected";

export type SyncStatus =
  | "local_only"
  | "pending"
  | "syncing"
  | "synced"
  | "error"
  | "conflict";

export type CollectionResponseValue = string | number | boolean | null;
export type CollectionResponseMap = Record<string, CollectionResponseValue>;

export type CollectionModuleDefinition = {
  id: number;
  code: string;
  name: string;
  description: string;
  display_order: number;
  active: boolean;
  version: number;
  valid_from: string | null;
  valid_to: string | null;
  is_demo: boolean;
  status?: CatalogStatus;
};

export type CollectionVariableDefinition = {
  id: number;
  code: string;
  name: string;
  operational_definition: string;
  module: number;
  module_code: string;
  variable_type: CollectionVariableType;
  unit: string;
  required: boolean;
  min_value: string | number | null;
  max_value: string | number | null;
  expected_source: string;
  help_text: string;
  display_order: number;
  active: boolean;
  version: number;
  select_options: string[];
  is_demo: boolean;
  status?: CatalogStatus;
  section_code?: string | null;
  section_name?: string | null;
  section_description?: string | null;
  section_layout?: CollectionSectionLayout | null;
  matrix_code?: string | null;
  matrix_name?: string | null;
  matrix_description?: string | null;
  matrix_row_code?: string | null;
  matrix_row_label?: string | null;
  matrix_row_order?: number | null;
  matrix_column_code?: string | null;
  matrix_column_label?: string | null;
  matrix_column_order?: number | null;
  read_only?: boolean;
  derived_value_operation?: DerivedValueOperation | null;
  derived_value_sources?: string[];
};

export type IndicatorDefinition = {
  id: number;
  code: string;
  name: string;
  definition: string;
  module: number;
  module_code: string;
  dimension: IndicatorDimension;
  unit: string;
  formula_kind: FormulaKind;
  formula_label: string;
  numerator_variable: number;
  numerator_variable_code: string;
  denominator_variable: number;
  denominator_variable_code: string;
  version: number;
  valid_from: string | null;
  valid_to: string | null;
  interpretation: string;
  is_demo: boolean;
  status?: CatalogStatus;
};

export type MethodologyCatalog = {
  modules: CollectionModuleDefinition[];
  variables: CollectionVariableDefinition[];
  indicators: IndicatorDefinition[];
};

export type DerivedIndicatorValue = {
  code: string;
  name: string;
  moduleCode: string;
  moduleName: string;
  dimension: IndicatorDimension;
  unit: string;
  formulaLabel: string;
  numeratorCode: string;
  denominatorCode: string;
  numeratorValue: number | null;
  denominatorValue: number | null;
  totalValue: number | null;
  totalLabel: string | null;
  value: number | null;
  version: number;
  interpretation: string;
  isDemo: boolean;
};

export type ModuleCompleteness = {
  moduleCode: string;
  moduleName: string;
  requiredFields: number;
  completedRequiredFields: number;
  percentage: number;
  isComplete: boolean;
};

export type ValidationSummary = {
  valid: boolean;
  missingRequiredFields: string[];
  inconsistencies: string[];
  completeModules: string[];
  incompleteModules: string[];
  completenessByModule: ModuleCompleteness[];
  requiredFields: number;
  completedRequiredFields: number;
  overallCompletionPercentage: number;
  calculatedIndicators: DerivedIndicatorValue[];
};

export type CollectionCyclePayload = {
  cycleUuid: string;
  unitId: number;
  reportingPeriodId: number;
  reportingPeriodLabel: string;
  collectionDate: string | null;
  responsibleUsername: string;
  version: number;
  collectionStatus: CollectionStatus;
  syncStatus: SyncStatus;
  generalObservation: string;
  catalogVersionSummary: string;
  updatedAt: string;
  closedAt: string | null;
  submittedAt: string | null;
  receivedAt: string | null;
  responses: CollectionResponseMap;
  validationSummary: ValidationSummary;
};

export type RecordEventType =
  | "collection_created"
  | "collection_opened"
  | "collection_saved"
  | "collection_period_changed"
  | "collection_closed"
  | "collection_reopened"
  | "collection_deleted"
  | "field_updated"
  | "sync_started"
  | "sync_succeeded"
  | "sync_failed"
  | "submission_received"
  | "indicator_calculated";

export type RecordEvent = {
  id: string;
  type: RecordEventType;
  action: string;
  label: string;
  occurredAt: string;
  actorName: string;
  actorRole: UserRole;
  entityType: string;
  entityId: string;
  unitId: number;
  reportingPeriodId: number;
  collectionDate: string | null;
  correlationId: string;
  source: "local" | "client_offline" | "server";
  metadata: Record<string, unknown>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  detail?: string | null;
};

export type AuditTrailEvent = RecordEvent & {
  recordId: string | null;
};

export type LocalSubmissionRecord = {
  id: string;
  institutionId: number;
  unitId: number;
  reportingPeriodId: number;
  reportingPeriodLabel: string;
  collectionDate: string | null;
  cycleUuid: string;
  responsibleUsername: string;
  responsibleDisplayName: string;
  responsibleRole: UserRole;
  collectionStatus: CollectionStatus;
  syncStatus: SyncStatus;
  generalObservation: string;
  responses: CollectionResponseMap;
  validationSummary: ValidationSummary;
  submissionUuid: string | null;
  versionUuid: string | null;
  versionNumber: number;
  basedOnRecordId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  submittedAt: string | null;
  receivedAt: string | null;
  syncedAt: string | null;
  acceptedAt: string | null;
  lastSyncAttemptAt: string | null;
  lastError: string | null;
  catalogVersionSummary: string;
  eventHistory: RecordEvent[];
};

export type SyncQueueItem = {
  id: string;
  localRecordId: string;
  submissionUuid: string;
  versionUuid: string;
  versionNumber: number;
  status: "queued" | "syncing" | "failed" | "synced";
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
};

export type AppUser = {
  username: string;
  fullName: string;
  role: UserRole;
  displayRole?: DisplayRole;
};

export type InstitutionContext = {
  id: number;
  name: string;
};

export type UnitContext = {
  id: number;
  name: string;
  code: string;
};

export type ReportingPeriodContext = {
  id: number;
  label: string;
  reference_year: number;
  reference_month: number;
  start_date: string;
  end_date: string;
  status: string;
};

export type ReportingPeriodPolicy = {
  minDate: string;
  maxDate: string;
};

export type BootstrapPayload = {
  institution: InstitutionContext;
  unit: UnitContext | null;
  reportingPeriod: ReportingPeriodContext | null;
  reportingPeriods: ReportingPeriodContext[];
  reportingPeriodPolicy?: ReportingPeriodPolicy;
  catalog: MethodologyCatalog;
  user: AppUser;
  demoNotice: string;
};
