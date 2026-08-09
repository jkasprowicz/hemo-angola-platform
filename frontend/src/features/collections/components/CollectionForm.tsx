import React from "react";
import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Switch,
  Text,
  Textarea,
} from "@mantine/core";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildValidationSummary,
  getSortedModules,
  getVariablesForModule,
  isValueFilled,
  normalizeResponseMap,
} from "../../../domain/collection/catalogEngine";
import { CollectionStatusBadge, SyncStatusBadge } from "../../../components/shared/StatusBadge";
import { collectionService } from "../services/collectionService";
import { useConnectivity } from "../../../hooks/useConnectivity";
import { runSync } from "../../../lib/sync/syncEngine";
import { getValidationCompletion } from "../../../lib/presentation/completion";
import type {
  BootstrapPayload,
  CollectionResponseMap,
  CollectionVariableDefinition,
  LocalSubmissionRecord,
  ReportingPeriodContext,
} from "../../../types/submission";


type CollectionFormValues = {
  responses: CollectionResponseMap;
  generalObservation: string;
};

export function CollectionForm({
  bootstrap,
  existingRecord,
  onClosed,
  onSavedAndExit,
}: {
  bootstrap: BootstrapPayload;
  existingRecord: LocalSubmissionRecord | null;
  onClosed: (recordId: string) => void;
  onSavedAndExit: (recordId: string) => void;
}) {
  const modules = useMemo(() => getSortedModules(bootstrap.catalog), [bootstrap.catalog]);
  const [step, setStep] = useState(0);
  const [currentRecord, setCurrentRecord] = useState<LocalSubmissionRecord | null>(existingRecord);
  const [saveStatus, setSaveStatus] = useState("Salvo neste dispositivo.");
  const [closingError, setClosingError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isSavingAndExiting, setIsSavingAndExiting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedReportingPeriodId, setSelectedReportingPeriodId] = useState<string | null>(
    existingRecord ? String(existingRecord.reportingPeriodId) : bootstrap.reportingPeriod ? String(bootstrap.reportingPeriod.id) : null,
  );
  const previousSerializedValuesRef = useRef<string | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const connectivity = useConnectivity();

  const form = useForm<CollectionFormValues>({
    defaultValues: {
      responses: collectionService.buildInitialResponses(bootstrap.catalog, existingRecord),
      generalObservation: existingRecord?.generalObservation ?? "",
    },
    mode: "onChange",
  });

  const rawResponses = form.watch("responses");
  const generalObservation = form.watch("generalObservation");

  useEffect(() => {
    setCurrentRecord(existingRecord);
    setSelectedReportingPeriodId(existingRecord ? String(existingRecord.reportingPeriodId) : bootstrap.reportingPeriod ? String(bootstrap.reportingPeriod.id) : null);
    const nextValues = {
      responses: normalizeResponseMap(
        bootstrap.catalog,
        collectionService.buildInitialResponses(bootstrap.catalog, existingRecord),
      ),
      generalObservation: existingRecord?.generalObservation ?? "",
    };
    form.reset(nextValues);
    previousSerializedValuesRef.current = JSON.stringify(nextValues);
  }, [bootstrap.catalog, bootstrap.reportingPeriod, existingRecord, form]);

  const responses = normalizeResponseMap(bootstrap.catalog, rawResponses);
  const validationSummary = buildValidationSummary(bootstrap.catalog, responses);

  const progress = useMemo(
    () => getValidationCompletion(validationSummary).overallCompletionPercentage,
    [validationSummary],
  );
  const isLastModule = step === Math.max(0, modules.length - 1);
  const selectedReportingPeriod = useMemo(
    () =>
      bootstrap.reportingPeriods.find((period) => String(period.id) === selectedReportingPeriodId) ??
      bootstrap.reportingPeriod ??
      null,
    [bootstrap.reportingPeriod, bootstrap.reportingPeriods, selectedReportingPeriodId],
  );

  useEffect(() => {
    if (isClosing || isSavingAndExiting || !currentRecord?.id) {
      return;
    }

    const serializedValues = JSON.stringify({ responses, generalObservation });
    if (previousSerializedValuesRef.current === null) {
      previousSerializedValuesRef.current = serializedValues;
      return;
    }
    if (previousSerializedValuesRef.current === serializedValues) {
      return;
    }

    previousSerializedValuesRef.current = serializedValues;
    const snapshot = JSON.parse(serializedValues) as CollectionFormValues;

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        setSaveStatus("Salvando neste dispositivo...");
        const saved = await collectionService.saveCollection(
          currentRecord.id,
          bootstrap.catalog,
          snapshot.responses,
          snapshot.generalObservation,
        );
        setCurrentRecord(saved);
        setSaveStatus("Salvo neste dispositivo.");
      });

    void saveQueueRef.current;
  }, [bootstrap.catalog, currentRecord?.id, generalObservation, isClosing, isSavingAndExiting, responses]);

  const handleReportingPeriodChange = async (nextPeriodId: string | null) => {
    if (!nextPeriodId || !currentRecord) {
      return;
    }

    if (currentRecord.collectionStatus !== "in_progress" && currentRecord.collectionStatus !== "ready_for_review") {
      setClosingError("O período não pode ser alterado após o fechamento da coleta.");
      return;
    }

    const nextPeriod = bootstrap.reportingPeriods.find((period) => String(period.id) === nextPeriodId);
    if (!nextPeriod) {
      return;
    }

    if (String(currentRecord.reportingPeriodId) === nextPeriodId) {
      setSelectedReportingPeriodId(nextPeriodId);
      return;
    }

    const existing = await collectionService.getActiveCollection(bootstrap, nextPeriod);
    if (existing && existing.id !== currentRecord.id) {
      const shouldContinueExisting = window.confirm(
        `Já existe uma coleta em andamento para ${nextPeriod.label}.\n\nDeseja continuar a coleta existente?`,
      );
      if (shouldContinueExisting) {
        onSavedAndExit(existing.id);
      } else {
        setSelectedReportingPeriodId(String(currentRecord.reportingPeriodId));
      }
      return;
    }

    try {
      const updated = await collectionService.updateReportingPeriod(currentRecord.id, nextPeriod);
      setCurrentRecord(updated);
      setSelectedReportingPeriodId(nextPeriodId);
      setSaveStatus("Período de referência atualizado.");
      setClosingError(null);
    } catch (error) {
      setClosingError(error instanceof Error ? error.message : "Não foi possível alterar o período.");
      setSelectedReportingPeriodId(String(currentRecord.reportingPeriodId));
    }
  };

  const handleClose = async (shouldSendImmediately: boolean) => {
    setClosingError(null);
    if (!currentRecord?.id) {
      setClosingError("Salve o rascunho antes de fechar.");
      return;
    }

    try {
      setIsClosing(true);
      const closed = await collectionService.closeCollection(currentRecord.id, bootstrap.catalog, form.getValues().responses);
      setCurrentRecord(closed);
      if (shouldSendImmediately && connectivity.isEffectivelyOnline) {
        await runSync([closed.id]);
        const refreshed = await collectionService.getCollection(closed.id);
        if (refreshed?.syncStatus === "synced") {
          setSaveStatus("Coleta fechada, enviada e recebida pelo servidor.");
        } else {
          setSaveStatus("Coleta fechada. O envio precisará ser retomado.");
        }
      } else {
        setSaveStatus("Coleta fechada e salva neste dispositivo. Ela será enviada quando houver conexão.");
      }
      onClosed(closed.id);
    } catch (error) {
      setIsClosing(false);
      setClosingError(error instanceof Error ? error.message : "Não foi possível fechar a coleta.");
    }
  };

  const handleSaveAndExit = async () => {
    if (!currentRecord?.id) {
      return;
    }

    try {
      setIsSavingAndExiting(true);
      setSaveStatus("Salvando neste dispositivo...");
      const saved = await collectionService.saveCollection(
        currentRecord.id,
        bootstrap.catalog,
        form.getValues().responses,
        form.getValues().generalObservation,
      );
      setCurrentRecord(saved);
      previousSerializedValuesRef.current = JSON.stringify({
        responses: form.getValues().responses,
        generalObservation: form.getValues().generalObservation,
      });
      setSaveStatus("Coleta salva neste dispositivo.");
      onSavedAndExit(saved.id);
    } finally {
      setIsSavingAndExiting(false);
    }
  };

  if (!currentRecord) {
    return null;
  }

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light">
        {bootstrap.demoNotice}
      </Alert>

      {modules.length === 0 ? (
        <Alert color="red" variant="light">
          Não foi possível carregar o catálogo demonstrativo da coleta. Recarregue o ambiente demo antes de continuar.
        </Alert>
      ) : null}

      <Card withBorder radius="md">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Cabeçalho da coleta</Text>
            <Group>
              <CollectionStatusBadge status={currentRecord.collectionStatus} />
              <SyncStatusBadge status={currentRecord.syncStatus} />
            </Group>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
            <InfoItem label="Unidade" value={bootstrap.unit?.name ?? "Não definida"} />
            <InfoItem label="Período" value={currentRecord.reportingPeriodLabel} />
            <InfoItem label="Última gravação" value={currentRecord?.lastSavedAt ? new Date(currentRecord.lastSavedAt).toLocaleString("pt-BR") : "Ainda não gravado"} />
            <InfoItem label="Versão" value={currentRecord.versionNumber > 0 ? String(currentRecord.versionNumber) : "Rascunho"} />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Select
              label="Período de referência"
              data={bootstrap.reportingPeriods.map((period) => ({ value: String(period.id), label: period.label }))}
              value={selectedReportingPeriodId}
              onChange={(value) => void handleReportingPeriodChange(value)}
              disabled={currentRecord.collectionStatus !== "in_progress" && currentRecord.collectionStatus !== "ready_for_review"}
            />
          </SimpleGrid>
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Progresso da coleta</Text>
            <Text size="sm">{progress}%</Text>
          </Group>
          <Progress value={progress} />
          <Text size="sm" c="dimmed">
            {saveStatus}
          </Text>
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Stack gap="xs">
          <Text fw={600}>Completude por módulo</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {validationSummary.completenessByModule.map((moduleSummary) => (
              <Card key={moduleSummary.moduleCode} withBorder radius="md" p="sm">
                <Group justify="space-between">
                  <Text fw={500}>{moduleSummary.moduleName}</Text>
                  <Text size="sm">{moduleSummary.percentage}%</Text>
                </Group>
                <Progress mt="xs" value={moduleSummary.percentage} />
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Card>

      <Stepper active={step} onStepClick={setStep} allowNextStepsSelect>
        {modules.map((module, index) => (
          <Stepper.Step
            key={module.code}
            label={`${index + 1}. ${module.name}`}
            description={`${validationSummary.completenessByModule[index]?.completedRequiredFields ?? 0}/${validationSummary.completenessByModule[index]?.requiredFields ?? 0} obrigatórios`}
            completedIcon={validationSummary.completenessByModule[index]?.isComplete ? undefined : <Text size="xs">{index + 1}</Text>}
          >
            <Stack gap="md">
              <div>
                <Text fw={600}>{module.name}</Text>
                <Text c="dimmed" size="sm">
                  {module.description}
                </Text>
              </div>

              {getVariablesForModule(bootstrap.catalog, module.code).map((variable) => (
                <DynamicVariableField
                  key={variable.code}
                  variable={variable}
                  missingRequired={variable.required && !isValueFilled(variable, responses[variable.code])}
                  control={form.control}
                />
              ))}

              <Card withBorder radius="md">
                <Stack gap="xs">
                  <Text fw={600}>Indicadores derivados do módulo</Text>
                  {validationSummary.calculatedIndicators
                    .filter((indicator) => indicator.moduleCode === module.code)
                    .map((indicator) => (
                      <Alert key={indicator.code} color={indicator.value === null ? "gray" : "blue"} variant="light">
                        <Text fw={700}>{indicator.name}</Text>
                        <Text size="xl" fw={700}>
                          {indicator.value === null ? "Aguardando dados válidos" : formatPercentage(indicator.value)}
                        </Text>
                        {indicator.totalLabel ? (
                          <Text size="sm">
                            {indicator.totalLabel}: {indicator.totalValue ?? "Aguardando dados válidos"}
                          </Text>
                        ) : null}
                        <Text size="sm" c="dimmed">
                          Fórmula: {indicator.formulaLabel}
                        </Text>
                        <Text size="sm" c="dimmed">
                          Interpretação: {indicator.interpretation}
                        </Text>
                      </Alert>
                    ))}
                </Stack>
              </Card>

              {isLastModule && index === modules.length - 1 ? (
                <>
                  <Controller
                    control={form.control}
                    name="generalObservation"
                    render={({ field }) => (
                      <Textarea
                        label="Observação geral do período"
                        description="Registre contexto operacional, limitações de apuração ou observações gerais desta coleta demonstrativa."
                        value={field.value}
                        onChange={field.onChange}
                        minRows={4}
                      />
                    )}
                  />

                  <CollectionSummary
                    bootstrap={bootstrap}
                    selectedReportingPeriod={selectedReportingPeriod}
                    responses={responses}
                    validationSummary={validationSummary}
                  />
                </>
              ) : null}
            </Stack>
          </Stepper.Step>
        ))}
      </Stepper>

      {closingError ? <Alert color="red">{closingError}</Alert> : null}

      <Modal opened={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Fechar e enviar esta coleta?">
        <Stack gap="md">
          <Text>Após o envio, os dados não poderão ser alterados diretamente.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsConfirmModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setIsConfirmModalOpen(false);
                void handleClose(true);
              }}
            >
              Fechar e enviar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Group justify="space-between">
        <Button variant="default" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
          Anterior
        </Button>
        <Group>
          <Button
            variant="light"
            onClick={handleSaveAndExit}
            disabled={!currentRecord?.id || isSavingAndExiting || isClosing}
            loading={isSavingAndExiting}
          >
            {isSavingAndExiting ? "Salvando..." : "Salvar e sair"}
          </Button>
          {step < modules.length - 1 ? (
            <Button onClick={() => setStep((current) => Math.min(modules.length - 1, current + 1))} disabled={isSavingAndExiting || isClosing}>
              Próximo
            </Button>
          ) : (
            <>
              {connectivity.isEffectivelyOnline ? (
                <Button
                  onClick={() => setIsConfirmModalOpen(true)}
                  loading={isClosing}
                  disabled={!validationSummary.valid || isClosing}
                >
                  Fechar e enviar
                </Button>
              ) : (
                <Button onClick={() => void handleClose(false)} loading={isClosing} disabled={!validationSummary.valid || isClosing}>
                  Fechar coleta
                </Button>
              )}
            </>
          )}
        </Group>
      </Group>
    </Stack>
  );
}


function DynamicVariableField({
  variable,
  missingRequired,
  control,
}: {
  variable: CollectionVariableDefinition;
  missingRequired: boolean;
  control: ReturnType<typeof useForm<CollectionFormValues>>["control"];
}) {
  const description = `${variable.operational_definition} ${
    variable.expected_source ? `Origem esperada: ${variable.expected_source}. ` : ""
  }${variable.unit ? `Unidade: ${variable.unit}. ` : ""}${variable.help_text}`;
  const error = missingRequired ? "Campo obrigatório." : undefined;

  if (variable.variable_type === "text") {
    return (
      <Controller
        control={control}
        name={`responses.${variable.code}` as const}
        render={({ field }) => (
          <Textarea
            label={variable.name}
            description={description}
            value={String(field.value ?? "")}
            onChange={field.onChange}
            error={error}
            minRows={3}
          />
        )}
      />
    );
  }

  if (variable.variable_type === "select") {
    return (
      <Controller
        control={control}
        name={`responses.${variable.code}` as const}
        render={({ field }) => (
          <Select
            label={variable.name}
            description={description}
            value={typeof field.value === "string" ? field.value : null}
            onChange={field.onChange}
            error={error}
            data={variable.select_options.map((option) => ({ value: option, label: option }))}
            clearable={!variable.required}
          />
        )}
      />
    );
  }

  if (variable.variable_type === "boolean") {
    return (
      <Controller
        control={control}
        name={`responses.${variable.code}` as const}
        render={({ field }) => (
          <Switch
            label={variable.name}
            description={description}
            checked={field.value === true}
            onChange={(event) => field.onChange(event.currentTarget.checked)}
            error={error}
          />
        )}
      />
    );
  }

  return (
    <Controller
      control={control}
      name={`responses.${variable.code}` as const}
      render={({ field }) => (
        <NumberInput
          label={variable.name}
          description={description}
          value={typeof field.value === "boolean" ? "" : (field.value ?? "")}
          onChange={(nextValue) => field.onChange(nextValue === "" ? null : nextValue)}
          error={error}
          min={variable.min_value === null ? undefined : Number(variable.min_value)}
          max={variable.max_value === null ? undefined : Number(variable.max_value)}
          decimalScale={variable.variable_type === "decimal" ? 2 : 0}
        />
      )}
    />
  );
}


function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="sm">
      <Text size="sm">{label}</Text>
      <Text size="sm" fw={600}>
        {value}
      </Text>
    </Group>
  );
}

function CollectionSummary({
  bootstrap,
  selectedReportingPeriod,
  responses,
  validationSummary,
}: {
  bootstrap: BootstrapPayload;
  selectedReportingPeriod: ReportingPeriodContext | null;
  responses: CollectionResponseMap;
  validationSummary: ReturnType<typeof buildValidationSummary>;
}) {
  const modules = getSortedModules(bootstrap.catalog);

  return (
    <Card withBorder radius="md">
      <Stack gap="md">
        <Text fw={700}>Resumo da coleta</Text>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <InfoItem label="Unidade" value={bootstrap.unit?.name ?? "Não definida"} />
          <InfoItem label="Período" value={selectedReportingPeriod?.label ?? "Não definido"} />
          <InfoItem
            label="Completude"
            value={`${validationSummary.completedRequiredFields}/${validationSummary.requiredFields} obrigatórios (${validationSummary.overallCompletionPercentage}%)`}
          />
          <InfoItem
            label="Campos inválidos"
            value={String(validationSummary.missingRequiredFields.length + validationSummary.inconsistencies.length)}
          />
        </SimpleGrid>

        {modules.map((module) => (
          <Card key={module.code} withBorder radius="md" p="sm">
            <Stack gap="xs">
              <Text fw={600}>{module.name}</Text>
              {getVariablesForModule(bootstrap.catalog, module.code).map((variable) => (
                <ReviewRow key={variable.code} label={variable.name} value={formatResponseValue(responses[variable.code])} />
              ))}
            </Stack>
          </Card>
        ))}

        <Card withBorder radius="md" p="sm">
          <Stack gap="xs">
            <Text fw={600}>Indicadores calculados</Text>
            {validationSummary.calculatedIndicators.map((indicator) => (
              <Alert key={indicator.code} color={indicator.value === null ? "gray" : "blue"} variant="light">
                <Text fw={700}>{indicator.name}</Text>
                <Text size="xl" fw={700}>
                  {indicator.value === null ? "Aguardando dados válidos" : formatPercentage(indicator.value)}
                </Text>
                <Text size="sm" c="dimmed">
                  Fórmula: {indicator.formulaLabel}
                </Text>
                <Text size="sm" c="dimmed">
                  Interpretação: {indicator.interpretation}
                </Text>
              </Alert>
            ))}
          </Stack>
        </Card>

        {validationSummary.missingRequiredFields.length > 0 || validationSummary.inconsistencies.length > 0 ? (
          <Alert color="yellow" variant="light">
            <Stack gap="xs">
              <Text fw={600}>Campos inválidos ou pendentes</Text>
              <Text size="sm">Obrigatórios ausentes: {validationSummary.missingRequiredFields.join(", ") || "Nenhum"}</Text>
              <Text size="sm">Inconsistências: {validationSummary.inconsistencies.join(" | ") || "Nenhuma"}</Text>
            </Stack>
          </Alert>
        ) : null}
      </Stack>
    </Card>
  );
}

function formatResponseValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR").format(value);
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "Não informado";
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value) + "%";
}
