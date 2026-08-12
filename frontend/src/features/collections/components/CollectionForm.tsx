import React from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@mantine/hooks";

import {
  buildSectionStatus,
  buildValidationSummary,
  getMatricesForSection,
  getSectionsForModule,
  getSortedModules,
  isValueFilled,
  normalizeResponseMap,
} from "../../../domain/collection/catalogEngine";
import { CollectionStatusBadge, SyncStatusBadge } from "../../../components/shared/StatusBadge";
import { collectionService, isCollectionDateWithinPeriod } from "../services/collectionService";
import { useConnectivity } from "../../../hooks/useConnectivity";
import { runSync } from "../../../lib/sync/syncEngine";
import type {
  BootstrapPayload,
  CollectionResponseMap,
  CollectionVariableDefinition,
  LocalSubmissionRecord,
  ReportingPeriodContext,
  ValidationSummary,
} from "../../../types/submission";

type CollectionFormValues = {
  responses: CollectionResponseMap;
  generalObservation: string;
};

type StepDefinition =
  | {
      key: string;
      type: "module";
      title: string;
      description: string;
      moduleCode: string;
    }
  | {
      key: "review";
      type: "review";
      title: string;
      description: string;
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
  const steps = useMemo<StepDefinition[]>(
    () => [
      ...modules.map((module) => ({
        key: module.code,
        type: "module" as const,
        title: module.name,
        description: module.description,
        moduleCode: module.code,
      })),
      {
        key: "review",
        type: "review" as const,
        title: "Revisão",
        description: "Confira pendências, indicadores derivados e contexto geral antes de fechar.",
      },
    ],
    [modules],
  );
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
  const [selectedCollectionDate, setSelectedCollectionDate] = useState<string>(existingRecord?.collectionDate ?? "");
  const previousSerializedValuesRef = useRef<string | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const connectivity = useConnectivity();
  const isMobileLayout = useMediaQuery("(max-width: 62em)");

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
    setSelectedCollectionDate(existingRecord?.collectionDate ?? "");
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
  const completedModules = validationSummary.completenessByModule.filter((module) => module.isComplete).length;
  const pendingRequiredFields =
    validationSummary.requiredFields - validationSummary.completedRequiredFields;
  const currentStep = steps[Math.min(step, Math.max(steps.length - 1, 0))];
  const isReviewStep = currentStep?.type === "review";
  const selectedReportingPeriod = useMemo(
    () =>
      bootstrap.reportingPeriods.find((period) => String(period.id) === selectedReportingPeriodId) ??
      bootstrap.reportingPeriod ??
      null,
    [bootstrap.reportingPeriod, bootstrap.reportingPeriods, selectedReportingPeriodId],
  );
  const collectionDateError =
    selectedCollectionDate &&
    selectedReportingPeriod &&
    !isCollectionDateWithinPeriod(selectedCollectionDate, selectedReportingPeriod)
      ? `A data da coleta deve pertencer a ${selectedReportingPeriod.label}.`
      : null;

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
        try {
          setSaveStatus("Salvando neste dispositivo...");
          const saved = await collectionService.saveCollection(
            currentRecord.id,
            bootstrap.catalog,
            snapshot.responses,
            snapshot.generalObservation,
          );
          setCurrentRecord(saved);
          setSaveStatus(`Salvo neste dispositivo às ${formatTime(saved.updatedAt)}.`);
        } catch (error) {
          setClosingError(error instanceof Error ? error.message : "Não foi possível salvar a coleta.");
          setSaveStatus("Não foi possível salvar neste dispositivo.");
        }
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

    try {
      const updated = await collectionService.updateReportingPeriod(currentRecord.id, nextPeriod);
      setCurrentRecord(updated);
      setSelectedReportingPeriodId(nextPeriodId);
      setSelectedCollectionDate(updated.collectionDate ?? "");
      setSaveStatus(`Período atualizado às ${formatTime(updated.updatedAt)}.`);
      setClosingError(null);
    } catch (error) {
      setClosingError(error instanceof Error ? error.message : "Não foi possível alterar o período.");
      setSelectedReportingPeriodId(String(currentRecord.reportingPeriodId));
    }
  };

  const handleCollectionDateChange = async (nextValue: string) => {
    setSelectedCollectionDate(nextValue);
    if (!currentRecord?.id) {
      return;
    }
    if (!nextValue) {
      setClosingError("Informe a data da coleta.");
      return;
    }
    if (selectedReportingPeriod && !isCollectionDateWithinPeriod(nextValue, selectedReportingPeriod)) {
      setClosingError(`A data da coleta deve pertencer a ${selectedReportingPeriod.label}.`);
      return;
    }

    try {
      const updated = await collectionService.updateCollectionDate(currentRecord.id, nextValue);
      setCurrentRecord(updated);
      setSaveStatus(`Data da coleta atualizada às ${formatTime(updated.updatedAt)}.`);
      setClosingError(null);
    } catch (error) {
      setClosingError(error instanceof Error ? error.message : "Não foi possível atualizar a data da coleta.");
    }
  };

  const handleClose = async (shouldSendImmediately: boolean) => {
    setClosingError(null);
    if (!currentRecord?.id) {
      setClosingError("Salve o rascunho antes de fechar.");
      return;
    }
    if (!selectedCollectionDate) {
      setClosingError("Informe a data da coleta antes de fechar.");
      return;
    }
    if (selectedReportingPeriod && !isCollectionDateWithinPeriod(selectedCollectionDate, selectedReportingPeriod)) {
      setClosingError(`A data da coleta deve pertencer a ${selectedReportingPeriod.label}.`);
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
        responses: normalizeResponseMap(bootstrap.catalog, form.getValues().responses),
        generalObservation: form.getValues().generalObservation,
      });
      setSaveStatus(`Salvo neste dispositivo às ${formatTime(saved.updatedAt)}.`);
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

      <CollectionHeader
        bootstrap={bootstrap}
        currentRecord={currentRecord}
        saveStatus={saveStatus}
        selectedReportingPeriodId={selectedReportingPeriodId}
        selectedCollectionDate={selectedCollectionDate}
        collectionDateError={collectionDateError}
        isMobileLayout={Boolean(isMobileLayout)}
        onReportingPeriodChange={handleReportingPeriodChange}
        onCollectionDateChange={handleCollectionDateChange}
      />

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Group justify="space-between" wrap="wrap">
            <div>
              <Text fw={700}>Andamento do instrumento</Text>
              <Text size="sm" c="dimmed">
                {completedModules}/{modules.length} módulos completos · {validationSummary.completedRequiredFields}/{validationSummary.requiredFields} campos obrigatórios preenchidos
              </Text>
            </div>
            <Badge color={pendingRequiredFields === 0 ? "teal" : "yellow"} variant="light" size="lg">
              {pendingRequiredFields} obrigatórios pendentes
            </Badge>
          </Group>
          <Progress value={validationSummary.overallCompletionPercentage} />
          <Text size="sm" c="dimmed">
            {saveStatus}
          </Text>
        </Stack>
      </Card>

      {isMobileLayout ? (
        <Card withBorder radius="md">
          <Stack gap="xs">
            <Text fw={600}>
              Etapa {step + 1} de {steps.length}
            </Text>
            <Text c="dimmed" size="sm">
              {currentStep?.title ?? "Revisão"}
            </Text>
            <Progress value={((step + 1) / Math.max(steps.length, 1)) * 100} />
          </Stack>
        </Card>
      ) : (
        <Stepper active={step} onStepClick={setStep} allowNextStepsSelect>
          {steps.map((stepDefinition, index) => (
            <Stepper.Step
              key={stepDefinition.key}
              label={`${index + 1}. ${stepDefinition.title}`}
              description={stepDefinition.type === "module"
                ? `${validationSummary.completenessByModule.find((module) => module.moduleCode === stepDefinition.moduleCode)?.completedRequiredFields ?? 0}/${validationSummary.completenessByModule.find((module) => module.moduleCode === stepDefinition.moduleCode)?.requiredFields ?? 0} obrigatórios`
                : `${validationSummary.missingRequiredFields.length + validationSummary.inconsistencies.length} pendências`}
            />
          ))}
        </Stepper>
      )}

      {currentStep?.type === "module" ? (
        <ModulePanel
          bootstrap={bootstrap}
          moduleCode={currentStep.moduleCode}
          responses={responses}
          validationSummary={validationSummary}
          control={form.control}
          isMobileLayout={Boolean(isMobileLayout)}
        />
      ) : null}

      {isReviewStep ? (
        <ReviewPanel
          bootstrap={bootstrap}
          currentRecord={currentRecord}
          selectedReportingPeriod={selectedReportingPeriod}
          collectionDate={selectedCollectionDate}
          validationSummary={validationSummary}
          responses={responses}
          generalObservation={generalObservation}
          control={form.control}
        />
      ) : null}

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

      {isMobileLayout ? (
        <Paper
          withBorder
          radius="md"
          p="sm"
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 20,
            backgroundColor: "#ffffff",
          }}
        >
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              {saveStatus}
            </Text>
            {step < steps.length - 1 ? (
              <Button
                fullWidth
                onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                disabled={isSavingAndExiting || isClosing}
              >
                Próximo
              </Button>
            ) : connectivity.isEffectivelyOnline ? (
              <Button
                fullWidth
                onClick={() => setIsConfirmModalOpen(true)}
                loading={isClosing}
                disabled={!validationSummary.valid || isClosing}
              >
                Fechar e enviar
              </Button>
            ) : (
              <Button
                fullWidth
                onClick={() => void handleClose(false)}
                loading={isClosing}
                disabled={!validationSummary.valid || isClosing}
              >
                Fechar coleta
              </Button>
            )}
            <Group grow>
              <Button
                variant="default"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
              >
                Anterior
              </Button>
              <Button
                variant="light"
                onClick={handleSaveAndExit}
                disabled={!currentRecord?.id || isSavingAndExiting || isClosing}
                loading={isSavingAndExiting}
              >
                {isSavingAndExiting ? "Salvando..." : "Salvar e sair"}
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : (
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Button variant="default" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
            Anterior
          </Button>
          <Group wrap="wrap">
            <Button
              variant="light"
              onClick={handleSaveAndExit}
              disabled={!currentRecord?.id || isSavingAndExiting || isClosing}
              loading={isSavingAndExiting}
            >
              {isSavingAndExiting ? "Salvando..." : "Salvar e sair"}
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} disabled={isSavingAndExiting || isClosing}>
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
      )}
    </Stack>
  );
}

function CollectionHeader({
  bootstrap,
  currentRecord,
  saveStatus,
  selectedReportingPeriodId,
  selectedCollectionDate,
  collectionDateError,
  isMobileLayout,
  onReportingPeriodChange,
  onCollectionDateChange,
}: {
  bootstrap: BootstrapPayload;
  currentRecord: LocalSubmissionRecord;
  saveStatus: string;
  selectedReportingPeriodId: string | null;
  selectedCollectionDate: string;
  collectionDateError: string | null;
  isMobileLayout: boolean;
  onReportingPeriodChange: (value: string | null) => void;
  onCollectionDateChange: (value: string) => void;
}) {
  if (isMobileLayout) {
    return (
      <Card withBorder radius="md">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Text fw={700}>{bootstrap.unit?.name ?? "Unidade não definida"}</Text>
              <Text size="sm" c="dimmed">
                {currentRecord.reportingPeriodLabel}
              </Text>
            </div>
            <Group gap="xs">
              <CollectionStatusBadge status={currentRecord.collectionStatus} />
              <SyncStatusBadge status={currentRecord.syncStatus} />
            </Group>
          </Group>
          <Text size="sm" c="dimmed">
            Coleta em {formatDate(currentRecord.collectionDate)} · {saveStatus}
          </Text>
          <SimpleGrid cols={2} spacing="sm">
            <InfoItem label="Responsável" value={currentRecord.responsibleDisplayName} />
            <InfoItem
              label="Versão"
              value={currentRecord.versionNumber > 0 ? String(currentRecord.versionNumber) : "Rascunho"}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Período de referência"
              data={bootstrap.reportingPeriods.map((period) => ({ value: String(period.id), label: period.label }))}
              value={selectedReportingPeriodId}
              onChange={onReportingPeriodChange}
              disabled={currentRecord.collectionStatus !== "in_progress" && currentRecord.collectionStatus !== "ready_for_review"}
            />
            <TextInput
              label="Data da coleta"
              type="date"
              value={selectedCollectionDate}
              onChange={(event) => onCollectionDateChange(event.currentTarget.value)}
              error={collectionDateError}
              disabled={currentRecord.collectionStatus !== "in_progress" && currentRecord.collectionStatus !== "ready_for_review"}
            />
          </SimpleGrid>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Text fw={700}>Cabeçalho da coleta</Text>
            <Text size="sm" c="dimmed">
              Contexto operacional desta coleta agregada.
            </Text>
          </div>
          <Group>
            <CollectionStatusBadge status={currentRecord.collectionStatus} />
            <SyncStatusBadge status={currentRecord.syncStatus} />
          </Group>
        </Group>
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
          <InfoItem label="Unidade" value={bootstrap.unit?.name ?? "Não definida"} />
          <InfoItem label="Responsável" value={currentRecord.responsibleDisplayName} />
          <InfoItem label="Última gravação" value={saveStatus} />
          <InfoItem label="Período" value={currentRecord.reportingPeriodLabel} />
          <InfoItem label="Data da coleta" value={formatDate(currentRecord.collectionDate)} />
          <InfoItem label="Versão local" value={currentRecord.versionNumber > 0 ? String(currentRecord.versionNumber) : "Rascunho"} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Select
            label="Período de referência"
            data={bootstrap.reportingPeriods.map((period) => ({ value: String(period.id), label: period.label }))}
            value={selectedReportingPeriodId}
            onChange={onReportingPeriodChange}
            disabled={currentRecord.collectionStatus !== "in_progress" && currentRecord.collectionStatus !== "ready_for_review"}
          />
          <TextInput
            label="Data da coleta"
            type="date"
            value={selectedCollectionDate}
            onChange={(event) => onCollectionDateChange(event.currentTarget.value)}
            error={collectionDateError}
            disabled={currentRecord.collectionStatus !== "in_progress" && currentRecord.collectionStatus !== "ready_for_review"}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

function ModulePanel({
  bootstrap,
  moduleCode,
  responses,
  validationSummary,
  control,
  isMobileLayout,
}: {
  bootstrap: BootstrapPayload;
  moduleCode: string;
  responses: CollectionResponseMap;
  validationSummary: ValidationSummary;
  control: ReturnType<typeof useForm<CollectionFormValues>>["control"];
  isMobileLayout: boolean;
}) {
  const module = getSortedModules(bootstrap.catalog).find((entry) => entry.code === moduleCode);
  const sections = getSectionsForModule(bootstrap.catalog, moduleCode);
  const firstIncompleteSectionCode = useMemo(
    () => getFirstIncompleteSectionCode(sections, responses) ?? sections[0]?.code ?? null,
    [responses, sections],
  );
  const pendingRequiredFields = useMemo(
    () => getPendingRequiredFields(sections, responses),
    [responses, sections],
  );
  const [openedSections, setOpenedSections] = useState<string[]>([]);

  useEffect(() => {
    if (!sections.length) {
      setOpenedSections([]);
      return;
    }

    if (isMobileLayout) {
      setOpenedSections(firstIncompleteSectionCode ? [firstIncompleteSectionCode] : [sections[0].code]);
      return;
    }

    const incompleteSections = sections
      .filter((section) => sectionHasMissingRequiredFields(section.variables, responses))
      .map((section) => section.code);
    setOpenedSections(
      incompleteSections.length > 0
        ? incompleteSections
        : firstIncompleteSectionCode
          ? [firstIncompleteSectionCode]
          : [sections[0].code],
    );
  }, [firstIncompleteSectionCode, isMobileLayout, responses, sections, moduleCode]);

  const handleJumpToNextPending = () => {
    const nextPending = pendingRequiredFields[0];
    if (!nextPending) {
      return;
    }
    setOpenedSections([nextPending.sectionCode]);
    requestAnimationFrame(() => focusField(nextPending.variable.code));
  };

  return (
    <Stack gap="md">
      <Card withBorder radius="md">
        <Stack gap="xs">
          <Text fw={700}>{module?.name ?? moduleCode}</Text>
          <Text size="sm" c="dimmed">
            {module?.description}
          </Text>
        </Stack>
      </Card>

      {pendingRequiredFields.length > 0 ? (
        <Alert color="yellow" variant="light" title="Pendências desta etapa">
          <Stack gap="xs">
            <Text size="sm">
              {pendingRequiredFields.length} campo(s) obrigatório(s) pendente(s):{" "}
              {pendingRequiredFields.slice(0, 3).map((item) => item.variable.name).join(", ")}
              {pendingRequiredFields.length > 3 ? "..." : ""}
            </Text>
            <Group>
              <Button size="xs" variant="white" onClick={handleJumpToNextPending}>
                Próxima pendência
              </Button>
              <Badge variant="light">
                {pendingRequiredFields.length} obrigatórios pendentes nesta etapa
              </Badge>
            </Group>
          </Stack>
        </Alert>
      ) : null}

      {isMobileLayout ? (
        <Accordion
          variant="separated"
          radius="md"
          value={openedSections[0] ?? null}
          onChange={(value) => setOpenedSections(value ? [value] : [])}
        >
          {sections.map((section) => (
            <SectionAccordionItem
              key={section.code}
              section={section}
              responses={responses}
              validationSummary={validationSummary}
              control={control}
              isMobileLayout={isMobileLayout}
            />
          ))}
        </Accordion>
      ) : (
        <Accordion
          variant="separated"
          radius="md"
          multiple
          value={openedSections}
          onChange={setOpenedSections}
        >
          {sections.map((section) => (
            <SectionAccordionItem
              key={section.code}
              section={section}
              responses={responses}
              validationSummary={validationSummary}
              control={control}
              isMobileLayout={isMobileLayout}
            />
          ))}
        </Accordion>
      )}

      <DerivedIndicatorsCard indicators={validationSummary.calculatedIndicators.filter((indicator) => indicator.moduleCode === moduleCode)} />
    </Stack>
  );
}

function SectionAccordionItem({
  section,
  responses,
  validationSummary,
  control,
  isMobileLayout,
}: {
  section: ReturnType<typeof getSectionsForModule>[number];
  responses: CollectionResponseMap;
  validationSummary: ValidationSummary;
  control: ReturnType<typeof useForm<CollectionFormValues>>["control"];
  isMobileLayout: boolean;
}) {
  const sectionStatus = buildSectionStatus(section.variables, responses);

  return (
    <Accordion.Item value={section.code}>
      <Accordion.Control>
        <Group justify="space-between" wrap="wrap">
          <div>
            <Text fw={600}>{section.name}</Text>
            <Text size="sm" c="dimmed">
              {section.description}
            </Text>
          </div>
          <Badge color={sectionStatus.isComplete ? "teal" : "yellow"} variant="light">
            {sectionStatus.completedRequiredFields}/{sectionStatus.requiredFields || 0} obrigatórios
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        {section.layout === "matrix" ? (
          <MatrixSection
            matrices={getMatricesForSection(section.variables)}
            responses={responses}
            validationSummary={validationSummary}
            control={control}
            isMobileLayout={isMobileLayout}
          />
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {section.variables.map((variable) => (
              <DynamicVariableField
                key={variable.code}
                variable={variable}
                value={responses[variable.code]}
                missingRequired={variable.required && !variable.read_only && !isValueFilled(variable, responses[variable.code])}
                control={control}
              />
            ))}
          </SimpleGrid>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function MatrixSection({
  matrices,
  responses,
  validationSummary,
  control,
  isMobileLayout,
}: {
  matrices: ReturnType<typeof getMatricesForSection>;
  responses: CollectionResponseMap;
  validationSummary: ValidationSummary;
  control: ReturnType<typeof useForm<CollectionFormValues>>["control"];
  isMobileLayout: boolean;
}) {
  return (
    <Stack gap="md">
      {matrices.map((matrix) => (
        <Card key={matrix.code} withBorder radius="md" p="md">
          <Stack gap="sm">
            <div>
              <Text fw={600}>{matrix.name}</Text>
              <Text size="sm" c="dimmed">
                {matrix.description}
              </Text>
            </div>
            {isMobileLayout ? (
              <Stack gap="sm">
                {matrix.rows.map((row, rowIndex) => {
                  const testedVariable = row.variables.find((variable) => variable.matrix_column_code === "testadas");
                  const reactiveVariable = row.variables.find((variable) => variable.matrix_column_code === "reagentes");
                  const testedValue = testedVariable ? asNumber(responses[testedVariable.code]) : null;
                  const reactiveValue = reactiveVariable ? asNumber(responses[reactiveVariable.code]) : null;
                  const rowRate =
                    testedValue !== null && reactiveValue !== null && testedValue > 0
                      ? `${formatPercentage((reactiveValue / testedValue) * 100)} de reatividade`
                      : "Sem base válida";
                  const rowHasValidationIssue = validationSummary.inconsistencies.some((issue) =>
                    issue.toLowerCase().includes(row.label.toLowerCase()),
                  );

                  return (
                    <Card key={row.code} withBorder radius="md" p="sm">
                      <Stack gap="xs">
                        <Text fw={600}>{row.label}</Text>
                        {matrix.columns.map((column, columnIndex) => {
                          const variable = row.variables.find((candidate) => candidate.matrix_column_code === column.code);
                          if (!variable) {
                            return null;
                          }
                          return (
                            <div key={`${row.code}-${column.code}`}>
                              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                                {column.label}
                              </Text>
                              <CompactNumberField
                                variable={variable}
                                control={control}
                                rowIndex={rowIndex}
                                columnIndex={columnIndex}
                              />
                            </div>
                          );
                        })}
                        <Text size="sm" c={rowHasValidationIssue ? "red" : "dimmed"}>
                          {rowRate}
                        </Text>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <Table.ScrollContainer minWidth={720}>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Categoria</Table.Th>
                      {matrix.columns.map((column) => (
                        <Table.Th key={column.code}>{column.label}</Table.Th>
                      ))}
                      <Table.Th>Leitura</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {matrix.rows.map((row, rowIndex) => {
                      const testedVariable = row.variables.find((variable) => variable.matrix_column_code === "testadas");
                      const reactiveVariable = row.variables.find((variable) => variable.matrix_column_code === "reagentes");
                      const testedValue = testedVariable ? asNumber(responses[testedVariable.code]) : null;
                      const reactiveValue = reactiveVariable ? asNumber(responses[reactiveVariable.code]) : null;
                      const rowRate =
                        testedValue !== null && reactiveValue !== null && testedValue > 0
                          ? `${formatPercentage((reactiveValue / testedValue) * 100)} de reatividade`
                          : "Sem base válida";
                      const rowHasValidationIssue = validationSummary.inconsistencies.some((issue) =>
                        issue.toLowerCase().includes(row.label.toLowerCase()),
                      );

                      return (
                        <Table.Tr key={row.code}>
                          <Table.Td>
                            <Text fw={500}>{row.label}</Text>
                          </Table.Td>
                          {matrix.columns.map((column, columnIndex) => {
                            const variable = row.variables.find((candidate) => candidate.matrix_column_code === column.code);
                            return (
                              <Table.Td key={`${row.code}-${column.code}`}>
                                {variable ? (
                                  <CompactNumberField
                                    variable={variable}
                                    control={control}
                                    rowIndex={rowIndex}
                                    columnIndex={columnIndex}
                                  />
                                ) : (
                                  <Text size="sm" c="dimmed">
                                    -
                                  </Text>
                                )}
                              </Table.Td>
                            );
                          })}
                          <Table.Td>
                            <Text size="sm" c={rowHasValidationIssue ? "red" : "dimmed"}>
                              {rowRate}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function ReviewPanel({
  bootstrap,
  currentRecord,
  selectedReportingPeriod,
  collectionDate,
  validationSummary,
  responses,
  generalObservation,
  control,
}: {
  bootstrap: BootstrapPayload;
  currentRecord: LocalSubmissionRecord;
  selectedReportingPeriod: ReportingPeriodContext | null;
  collectionDate: string;
  validationSummary: ValidationSummary;
  responses: CollectionResponseMap;
  generalObservation: string;
  control: ReturnType<typeof useForm<CollectionFormValues>>["control"];
}) {
  const modules = getSortedModules(bootstrap.catalog);

  return (
    <Stack gap="md">
      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={700}>Resumo da coleta</Text>
          <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
            <InfoItem label="Unidade" value={bootstrap.unit?.name ?? "Não definida"} />
            <InfoItem label="Período" value={selectedReportingPeriod?.label ?? "Não definido"} />
            <InfoItem label="Data da coleta" value={formatDate(collectionDate)} />
            <InfoItem label="Responsável" value={currentRecord.responsibleDisplayName} />
          </SimpleGrid>
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Card withBorder radius="md">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Completude</Text>
            <Text fw={700} size="xl">{validationSummary.overallCompletionPercentage}%</Text>
            <Text size="sm">
              {validationSummary.completedRequiredFields}/{validationSummary.requiredFields} obrigatórios preenchidos
            </Text>
          </Stack>
        </Card>
        <Card withBorder radius="md">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Campos obrigatórios pendentes</Text>
            <Text fw={700} size="xl">{validationSummary.missingRequiredFields.length}</Text>
            <Text size="sm">Revisão por exceção antes do fechamento</Text>
          </Stack>
        </Card>
        <Card withBorder radius="md">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Inconsistências lógicas</Text>
            <Text fw={700} size="xl">{validationSummary.inconsistencies.length}</Text>
            <Text size="sm">Validações locais e relações entre campos</Text>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Estado por módulo</Text>
          {modules.map((module) => {
            const summary = validationSummary.completenessByModule.find((item) => item.moduleCode === module.code);
            return (
              <Group key={module.code} justify="space-between" wrap="wrap">
                <div>
                  <Text fw={500}>{module.name}</Text>
                  <Text size="sm" c="dimmed">{module.description}</Text>
                </div>
                <Badge color={summary?.isComplete ? "teal" : "yellow"} variant="light">
                  {summary?.completedRequiredFields ?? 0}/{summary?.requiredFields ?? 0} obrigatórios
                </Badge>
              </Group>
            );
          })}
        </Stack>
      </Card>

      {validationSummary.missingRequiredFields.length > 0 ? (
        <Alert color="yellow" title="Campos obrigatórios pendentes">
          <Stack gap={4}>
            {validationSummary.missingRequiredFields.map((field) => (
              <Text size="sm" key={field}>{field}</Text>
            ))}
          </Stack>
        </Alert>
      ) : null}

      {validationSummary.inconsistencies.length > 0 ? (
        <Alert color="red" title="Inconsistências lógicas">
          <Stack gap={4}>
            {validationSummary.inconsistencies.map((issue) => (
              <Text size="sm" key={issue}>{issue}</Text>
            ))}
          </Stack>
        </Alert>
      ) : null}

      <Controller
        control={control}
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

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Leituras derivadas e volumes principais</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <ReviewRow label="Doações voluntárias" value={formatResponseValue(responses.donacoes_voluntarias)} />
            <ReviewRow label="Doações de reposição" value={formatResponseValue(responses.donacoes_reposicao)} />
            <ReviewRow label="Candidatos triados" value={formatResponseValue((asNumber(responses.candidatos_aptos) ?? 0) + (asNumber(responses.candidatos_inaptos) ?? 0))} />
            <ReviewRow label="Amostras testadas" value={formatResponseValue(responses.amostras_testadas)} />
            <ReviewRow label="Amostras reagentes" value={formatResponseValue(responses.amostras_reagentes)} />
            <ReviewRow
              label="Interrupções totais"
              value={formatResponseValue(
                (asNumber(responses.candidatos_desistentes) ?? 0) +
                  (asNumber(responses.dificuldade_puncao_venosa) ?? 0) +
                  (asNumber(responses.reacao_vagal) ?? 0) +
                  (asNumber(responses.interrupcao_outros_motivos) ?? 0),
              )}
            />
          </SimpleGrid>
          {generalObservation ? (
            <Text size="sm" c="dimmed">
              Observação atual: {generalObservation}
            </Text>
          ) : null}
        </Stack>
      </Card>

      <DerivedIndicatorsCard indicators={validationSummary.calculatedIndicators} />
    </Stack>
  );
}

function DerivedIndicatorsCard({
  indicators,
}: {
  indicators: ValidationSummary["calculatedIndicators"];
}) {
  if (!indicators.length) {
    return null;
  }

  return (
    <Card withBorder radius="md">
      <Stack gap="sm">
        <Text fw={600}>Indicadores derivados</Text>
        {indicators.map((indicator) => (
          <Alert key={indicator.code} color={indicator.value === null ? "gray" : "blue"} variant="light">
            <Text fw={700}>{indicator.name}</Text>
            <Text size="xl" fw={700}>
              {indicator.value === null ? "Aguardando dados válidos" : formatPercentage(indicator.value)}
            </Text>
            {indicator.totalLabel ? (
              <Text size="sm">
                {indicator.totalLabel}: {indicator.totalValue === null ? "Sem base válida" : formatResponseValue(indicator.totalValue)}
              </Text>
            ) : null}
            <Text size="sm" c="dimmed">
              Fórmula: {indicator.formulaLabel}
            </Text>
          </Alert>
        ))}
      </Stack>
    </Card>
  );
}

function DynamicVariableField({
  variable,
  value,
  missingRequired,
  control,
}: {
  variable: CollectionVariableDefinition;
  value: CollectionResponseMap[string];
  missingRequired: boolean;
  control: ReturnType<typeof useForm<CollectionFormValues>>["control"];
}) {
  const description = `${variable.operational_definition} ${
    variable.expected_source ? `Origem esperada: ${variable.expected_source}. ` : ""
  }${variable.unit ? `Unidade: ${variable.unit}. ` : ""}${variable.help_text}`;
  const error = missingRequired ? "Campo obrigatório." : undefined;

  if (variable.read_only) {
    return (
        <TextInput
          id={variable.code}
          label={variable.name}
          description={description}
          value={formatResponseValue(value)}
          readOnly
        />
    );
  }

  if (variable.variable_type === "text") {
    return (
      <Controller
        control={control}
        name={`responses.${variable.code}` as const}
        render={({ field }) => (
          <Textarea
            id={variable.code}
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
            id={variable.code}
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
            id={variable.code}
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
          id={variable.code}
          label={variable.name}
          description={description}
          value={typeof field.value === "boolean" ? "" : (field.value ?? "")}
          onChange={(nextValue) => field.onChange(nextValue === "" ? null : nextValue)}
          error={error}
          min={variable.min_value === null ? undefined : Number(variable.min_value)}
          max={variable.max_value === null ? undefined : Number(variable.max_value)}
          decimalScale={variable.variable_type === "decimal" ? 2 : 0}
          hideControls
        />
      )}
    />
  );
}

function CompactNumberField({
  variable,
  control,
  rowIndex,
  columnIndex,
}: {
  variable: CollectionVariableDefinition;
  control: ReturnType<typeof useForm<CollectionFormValues>>["control"];
  rowIndex: number;
  columnIndex: number;
}) {
  const cellIndex = rowIndex * 10 + columnIndex;

  return (
    <Controller
      control={control}
      name={`responses.${variable.code}` as const}
      render={({ field }) => (
        <NumberInput
          id={variable.code}
          aria-label={`${variable.matrix_row_label} ${variable.matrix_column_label}`}
          value={typeof field.value === "boolean" ? "" : (field.value ?? "")}
          onChange={(nextValue) => field.onChange(nextValue === "" ? null : nextValue)}
          min={variable.min_value === null ? undefined : Number(variable.min_value)}
          max={variable.max_value === null ? undefined : Number(variable.max_value)}
          decimalScale={0}
          hideControls
          data-matrix-input="true"
          data-matrix-index={cellIndex}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            event.preventDefault();
            const nextInput = document.querySelector<HTMLInputElement>(`[data-matrix-index="${cellIndex + 1}"]`);
            nextInput?.focus();
          }}
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Não informada";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "--:--";
  }

  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "Sem base válida";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function formatResponseValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }
  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR").format(value);
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  return String(value);
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sectionHasMissingRequiredFields(
  variables: CollectionVariableDefinition[],
  responses: CollectionResponseMap,
) {
  return variables.some(
    (variable) =>
      variable.required &&
      !variable.read_only &&
      !isValueFilled(variable, responses[variable.code]),
  );
}

function getFirstIncompleteSectionCode(
  sections: ReturnType<typeof getSectionsForModule>,
  responses: CollectionResponseMap,
) {
  return (
    sections.find((section) => sectionHasMissingRequiredFields(section.variables, responses))?.code ?? null
  );
}

function getPendingRequiredFields(
  sections: ReturnType<typeof getSectionsForModule>,
  responses: CollectionResponseMap,
) {
  return sections.flatMap((section) =>
    section.variables
      .filter(
        (variable) =>
          variable.required &&
          !variable.read_only &&
          !isValueFilled(variable, responses[variable.code]),
      )
      .map((variable) => ({ sectionCode: section.code, variable })),
  );
}

function focusField(fieldCode: string) {
  const field = document.getElementById(fieldCode);
  if (!field) {
    return;
  }
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  requestAnimationFrame(() => {
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.focus();
      field.select();
      return;
    }
    if (field instanceof HTMLElement) {
      field.focus();
    }
  });
}
