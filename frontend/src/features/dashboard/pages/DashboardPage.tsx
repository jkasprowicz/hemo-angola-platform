import {
  Accordion,
  ActionIcon,
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  Popover,
  Select,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconChevronRight,
  IconDroplet,
  IconFilter,
  IconFlask2,
  IconInfoCircle,
  IconStethoscope,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { useBootstrap } from "../../../hooks/useBootstrap";
import { useSession } from "../../../hooks/useSession";
import { dashboardService } from "../../../services/dashboardService";
import type {
  DashboardIndicatorBaseDatum,
  DashboardIndicatorPayload,
  DashboardSeriesPayload,
  DashboardTableRowPayload,
  DashboardTraceRecord,
} from "../../../types/api";

const INDICATOR_ORDER = [
  "percentual_doacoes_voluntarias",
  "taxa_inaptidao_clinica",
  "taxa_reatividade",
] as const;

type FilterState = {
  unitId: string | null;
  periodFrom: string | null;
  periodTo: string | null;
};

type DashboardView = "overview" | "trends" | "consolidated";

type IndicatorViewModel = {
  code: string;
  title: string;
  value: string;
  unit: string;
  referenceNote: string;
  absoluteSummary: string;
  detailRows: string[];
  definition: string;
  formula: string;
  numerator: string;
  denominator: string;
  trend: string | null;
  icon: typeof IconDroplet;
};

export function DashboardPage() {
  const session = useSession();
  const bootstrap = useBootstrap(session.data?.authenticated === true);
  const navigate = useNavigate();
  const isMobileLayout = useMediaQuery("(max-width: 62em)") ?? false;
  const [draftFilters, setDraftFilters] = useState<FilterState>({
    unitId: null,
    periodFrom: null,
    periodTo: null,
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    unitId: null,
    periodFrom: null,
    periodTo: null,
  });
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState<string>(INDICATOR_ORDER[0]);
  const [selectedView, setSelectedView] = useState<DashboardView>("overview");

  useEffect(() => {
    if (!bootstrap.data) {
      return;
    }

    const periodsAscending = [...bootstrap.data.reportingPeriods].sort(comparePeriodsAsc);
    const firstPeriod = periodsAscending[0];
    const defaultTo = bootstrap.data.reportingPeriod ?? periodsAscending[periodsAscending.length - 1] ?? null;
    const initialFilters = {
      unitId: String(bootstrap.data.unit?.id ?? ""),
      periodFrom: firstPeriod ? String(firstPeriod.id) : null,
      periodTo: defaultTo ? String(defaultTo.id) : null,
    };

    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }, [bootstrap.data]);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", appliedFilters.unitId, appliedFilters.periodFrom, appliedFilters.periodTo],
    queryFn: () =>
      dashboardService.getDashboard({
        unitId: appliedFilters.unitId ? Number(appliedFilters.unitId) : null,
        periodFrom: appliedFilters.periodFrom ? Number(appliedFilters.periodFrom) : null,
        periodTo: appliedFilters.periodTo ? Number(appliedFilters.periodTo) : null,
      }),
    enabled: Boolean(bootstrap.data && appliedFilters.periodFrom && appliedFilters.periodTo),
    staleTime: 10_000,
  });

  const periodOptions = useMemo(
    () =>
      [...(bootstrap.data?.reportingPeriods ?? [])]
        .sort(comparePeriodsAsc)
        .map((period) => ({ value: String(period.id), label: period.label })),
    [bootstrap.data?.reportingPeriods],
  );
  const unitOptions = useMemo(
    () =>
      bootstrap.data?.unit
        ? [{ value: String(bootstrap.data.unit.id), label: bootstrap.data.unit.name }]
        : [],
    [bootstrap.data?.unit],
  );
  const orderedIndicators = useMemo(() => {
    const indicators = dashboardQuery.data?.indicators ?? [];
    return [...indicators].sort(
      (left, right) => INDICATOR_ORDER.indexOf(left.code as (typeof INDICATOR_ORDER)[number]) -
        INDICATOR_ORDER.indexOf(right.code as (typeof INDICATOR_ORDER)[number]),
    );
  }, [dashboardQuery.data?.indicators]);
  const selectedSeries = useMemo(
    () =>
      dashboardQuery.data?.series.find((series) => series.indicator_code === selectedIndicatorCode) ??
      dashboardQuery.data?.series[0] ??
      null,
    [dashboardQuery.data?.series, selectedIndicatorCode],
  );
  const indicatorSeriesMap = useMemo(
    () => new Map((dashboardQuery.data?.series ?? []).map((series) => [series.indicator_code, series])),
    [dashboardQuery.data?.series],
  );
  const volumeSummary = useMemo(
    () => summarizeVolumes(dashboardQuery.data?.table ?? []),
    [dashboardQuery.data?.table],
  );
  const contextItems = useMemo(
    () => (bootstrap.data ? buildContextItems(bootstrap.data, dashboardQuery.data) : []),
    [bootstrap.data, dashboardQuery.data],
  );
  const indicatorCards = useMemo(
    () => orderedIndicators.map((indicator) => buildIndicatorViewModel(indicator, indicatorSeriesMap.get(indicator.code))),
    [indicatorSeriesMap, orderedIndicators],
  );
  const filtersDirty =
    draftFilters.unitId !== appliedFilters.unitId ||
    draftFilters.periodFrom !== appliedFilters.periodFrom ||
    draftFilters.periodTo !== appliedFilters.periodTo;

  useEffect(() => {
    if (!dashboardQuery.data?.series.length) {
      return;
    }

    const availableCodes = dashboardQuery.data.series.map((series) => series.indicator_code);
    if (!availableCodes.includes(selectedIndicatorCode)) {
      setSelectedIndicatorCode(dashboardQuery.data.series[0].indicator_code);
    }
  }, [dashboardQuery.data?.series, selectedIndicatorCode]);

  if (!bootstrap.data) {
    return null;
  }

  return (
    <Stack gap="xl" pb="md">
      <DashboardContextBar items={contextItems} isMobileLayout={isMobileLayout} />

      <DashboardFilters
        isMobileLayout={isMobileLayout}
        filters={draftFilters}
        unitOptions={unitOptions}
        periodOptions={periodOptions}
        loading={dashboardQuery.isFetching}
        dirty={filtersDirty}
        onChange={(field, value) => setDraftFilters((current) => ({ ...current, [field]: value }))}
        onApply={() => setAppliedFilters(draftFilters)}
      />

      {dashboardQuery.isLoading ? <DashboardLoadingState /> : null}

      {dashboardQuery.isError ? (
        <DashboardErrorState onRetry={() => void dashboardQuery.refetch()} />
      ) : null}

      {dashboardQuery.data ? (
        <>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            {indicatorCards.map((indicator) => (
              <IndicatorCard key={indicator.code} indicator={indicator} />
            ))}
          </SimpleGrid>

          {!dashboardQuery.data.empty ? (
            <>
              <DashboardViewSwitcher
                isMobileLayout={isMobileLayout}
                value={selectedView}
                onChange={(value) => setSelectedView(value)}
              />

              {selectedView === "overview" ? (
                <Stack gap="lg" data-testid="dashboard-view-overview">
                  <VolumeSummaryPanel volumeSummary={volumeSummary} />
                  <SectionSurface
                    title="Leitura executiva"
                    description="O painel principal mantém foco nos 3 KPIs centrais e nos volumes absolutos do recorte aplicado."
                  >
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                      <InsightCard
                        title="Doações"
                        summary={`${formatAbsoluteNumber(volumeSummary.donations)} doações consolidadas`}
                        detail="Use esta base para interpretar o percentual de voluntárias no intervalo selecionado."
                      />
                      <InsightCard
                        title="Triagem clínica"
                        summary={`${formatAbsoluteNumber(volumeSummary.screenedCandidates)} candidatos triados`}
                        detail="A taxa de inaptidão permanece recalculada a partir dos absolutos consolidados."
                      />
                      <InsightCard
                        title="Triagem laboratorial"
                        summary={`${formatAbsoluteNumber(volumeSummary.testedSamples)} amostras testadas`}
                        detail="A reatividade continua sendo lida sobre o universo testado recebido no backend."
                      />
                    </SimpleGrid>
                  </SectionSurface>
                </Stack>
              ) : null}

              {selectedView === "trends" ? (
                <Stack gap="lg" data-testid="dashboard-view-trends">
                  <SectionSurface
                    title="Evolução temporal"
                    description="Selecione um indicador e explore a série temporal consolidada. Cada ponto representa um período com dados recebidos pelo servidor."
                    rightSection={
                      <Select
                        aria-label="Selecionar indicador da série temporal"
                        data={orderedIndicators.map((indicator) => ({
                          value: indicator.code,
                          label: indicator.name,
                        }))}
                        value={selectedSeries?.indicator_code ?? selectedIndicatorCode}
                        onChange={(value) => setSelectedIndicatorCode(value ?? INDICATOR_ORDER[0])}
                        allowDeselect={false}
                        w={{ base: "100%", sm: 320 }}
                      />
                    }
                  >
                    {selectedSeries ? (
                      <DashboardSeriesChart
                        series={selectedSeries}
                        isMobileLayout={isMobileLayout}
                        onPointClick={(periodId) => navigate(`/registros?period=${periodId}&source=dashboard`)}
                      />
                    ) : null}
                  </SectionSurface>
                </Stack>
              ) : null}

              {selectedView === "consolidated" ? (
                <Stack gap="lg" data-testid="dashboard-view-consolidated">
                  <VolumeSummaryPanel volumeSummary={volumeSummary} compact />
                  <SectionSurface
                    title="Dados consolidados"
                    description="Consolidação analítica por período, com acesso direto às coletas correspondentes."
                  >
                    <ConsolidatedDataSection
                      isMobileLayout={isMobileLayout}
                      rows={dashboardQuery.data.table}
                      onOpenPeriod={(periodId) => navigate(`/registros?period=${periodId}&source=dashboard`)}
                    />
                  </SectionSurface>
                </Stack>
              ) : null}
            </>
          ) : (
            <DashboardEmptyState />
          )}

          <Text size="sm" c="dimmed">
            {dashboardQuery.data.summary.workflow_note}
          </Text>
        </>
      ) : null}
    </Stack>
  );
}

function DashboardContextBar({
  items,
  isMobileLayout,
}: {
  items: Array<{ label: string; value: string }>;
  isMobileLayout: boolean | undefined;
}) {
  return (
    <Paper
      data-testid="dashboard-context-bar"
      radius="lg"
      p={isMobileLayout ? "md" : "lg"}
      style={{
        backgroundColor: isMobileLayout ? "#fbfdfe" : "#f8fbfd",
        border: "1px solid #dce8ee",
      }}
    >
      <Stack gap={isMobileLayout ? "sm" : "md"}>
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Text fw={700}>Painel hemoterápico</Text>
            <Text size="sm" c="dimmed">
              {isMobileLayout
                ? "Contexto compacto do recorte analítico."
                : "Contexto do recorte atual para leitura rápida do painel."}
            </Text>
          </div>
        </Group>
        <SimpleGrid cols={{ base: 2, lg: 4 }} spacing={isMobileLayout ? "sm" : "lg"}>
        {items.map((item) => (
          <ContextMetric key={item.label} label={item.label} value={item.value} />
        ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

function DashboardFilters({
  isMobileLayout,
  filters,
  unitOptions,
  periodOptions,
  loading,
  dirty,
  onChange,
  onApply,
}: {
  isMobileLayout: boolean | undefined;
  filters: FilterState;
  unitOptions: Array<{ value: string; label: string }>;
  periodOptions: Array<{ value: string; label: string }>;
  loading: boolean;
  dirty: boolean;
  onChange: (field: keyof FilterState, value: string | null) => void;
  onApply: () => void;
}) {
  return (
    <Paper
      radius="lg"
      p={isMobileLayout ? "md" : "lg"}
      data-testid="dashboard-filter-bar"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #dce8ee",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs">
            <ThemeIcon size={isMobileLayout ? "sm" : "md"} variant="light" color="cyan">
              <IconFilter size={16} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Filtros analíticos</Text>
              <Text size="sm" c="dimmed">
                {isMobileLayout
                  ? "Ajuste o recorte e aplique."
                  : "Ajuste unidade e período antes de atualizar o painel."}
              </Text>
            </div>
          </Group>
          {!isMobileLayout ? (
            <Button onClick={onApply} loading={loading} disabled={!dirty}>
              Aplicar
            </Button>
          ) : null}
        </Group>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <Select
            label="Unidade"
            data={unitOptions}
            value={filters.unitId}
            onChange={(value) => onChange("unitId", value)}
            allowDeselect={false}
            data-testid="dashboard-filter-unit"
          />
          <Select
            label="Período inicial"
            data={periodOptions}
            value={filters.periodFrom}
            onChange={(value) => onChange("periodFrom", value)}
            allowDeselect={false}
            data-testid="dashboard-filter-period-from"
          />
          <Select
            label="Período final"
            data={periodOptions}
            value={filters.periodTo}
            onChange={(value) => onChange("periodTo", value)}
            allowDeselect={false}
            data-testid="dashboard-filter-period-to"
          />
        </SimpleGrid>
        {isMobileLayout ? (
          <Group justify="stretch" data-testid="dashboard-filter-actions-mobile">
            <Button fullWidth onClick={onApply} loading={loading} disabled={!dirty}>
              Aplicar filtros
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}

function DashboardViewSwitcher({
  isMobileLayout,
  value,
  onChange,
}: {
  isMobileLayout: boolean | undefined;
  value: DashboardView;
  onChange: (value: DashboardView) => void;
}) {
  return (
    <Paper
      radius="lg"
      p={isMobileLayout ? "sm" : "md"}
      withBorder
      data-testid="dashboard-view-switcher"
    >
      <Stack gap="xs">
        <Text fw={600}>Views analíticas</Text>
        <SegmentedControl
          fullWidth
          data-testid="dashboard-view-control"
          value={value}
          onChange={(nextValue) => onChange(nextValue as DashboardView)}
          data={[
            { value: "overview", label: "Visão geral" },
            { value: "trends", label: "Tendências" },
            { value: "consolidated", label: "Consolidados" },
          ]}
        />
      </Stack>
    </Paper>
  );
}

function VolumeSummaryPanel({
  volumeSummary,
  compact = false,
}: {
  volumeSummary: ReturnType<typeof summarizeVolumes>;
  compact?: boolean;
}) {
  return (
    <Paper
      p={compact ? "md" : "lg"}
      radius="lg"
      style={{
        backgroundColor: "#f6fbfc",
        border: "1px solid #d8eef2",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div>
            <Text size="sm" tt="uppercase" fw={700} c="cyan.8">
              Volume analisado
            </Text>
            <Text size="sm" c="dimmed">
              Totais consolidados do intervalo aplicado para apoiar a leitura dos percentuais.
            </Text>
          </div>
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 5 }} spacing="md">
          <ContextMetric
            label="Coletas consolidadas"
            value={formatAbsoluteNumber(volumeSummary.collections)}
          />
          <ContextMetric
            label="Períodos com dados"
            value={formatAbsoluteNumber(volumeSummary.periods)}
          />
          <ContextMetric label="Doações" value={formatAbsoluteNumber(volumeSummary.donations)} />
          <ContextMetric
            label="Candidatos triados"
            value={formatAbsoluteNumber(volumeSummary.screenedCandidates)}
          />
          <ContextMetric
            label="Amostras testadas"
            value={formatAbsoluteNumber(volumeSummary.testedSamples)}
          />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

function InsightCard({
  title,
  summary,
  detail,
}: {
  title: string;
  summary: string;
  detail: string;
}) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Stack gap="xs">
        <Text fw={600}>{title}</Text>
        <Text fw={700}>{summary}</Text>
        <Text size="sm" c="dimmed">
          {detail}
        </Text>
      </Stack>
    </Paper>
  );
}

function DashboardLoadingState() {
  return (
    <Stack gap="lg" role="status" aria-live="polite">
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Paper key={index} radius="lg" p="lg" withBorder>
            <Skeleton height={14} width="40%" mb="md" />
            <Skeleton height={42} width="48%" mb="sm" />
            <Skeleton height={12} width="72%" mb="xs" />
            <Skeleton height={12} width="64%" />
          </Paper>
        ))}
      </SimpleGrid>
      <Paper radius="lg" p="lg" withBorder>
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>
              <Skeleton height={12} width="44%" mb="xs" />
              <Skeleton height={28} width="55%" />
            </div>
          ))}
        </SimpleGrid>
      </Paper>
      <Paper radius="lg" p="lg" withBorder>
        <Stack gap="md">
          <Skeleton height={16} width="24%" />
          <Skeleton height={220} />
          <Group justify="center">
            <Loader size="sm" />
            <Text size="sm">Carregando dados consolidados…</Text>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}

function DashboardErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert
      color="red"
      title="Não foi possível carregar os indicadores."
      role="alert"
      data-testid="dashboard-error-state"
    >
      <Group justify="space-between" align="center" wrap="wrap">
        <Text size="sm">Revise os filtros aplicados e tente novamente.</Text>
        <Button variant="light" onClick={onRetry}>
          Tentar novamente
        </Button>
      </Group>
    </Alert>
  );
}

function DashboardEmptyState() {
  return (
    <Paper radius="lg" p="xl" withBorder data-testid="dashboard-empty-state">
      <Stack gap="xs">
        <Text fw={700}>Nenhum dado encontrado para os filtros selecionados.</Text>
        <Text size="sm" c="dimmed">
          Selecione outro período ou envie novas coletas para alimentar o painel analítico.
        </Text>
      </Stack>
    </Paper>
  );
}

function SectionSurface({
  title,
  description,
  rightSection,
  children,
}: {
  title: string;
  description: string;
  rightSection?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper radius="lg" p="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Text fw={700}>{title}</Text>
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </div>
          {rightSection}
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}

function IndicatorCard({ indicator }: { indicator: IndicatorViewModel }) {
  const Icon = indicator.icon;

  return (
    <Paper
      h="100%"
      radius="lg"
      p="lg"
      withBorder
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#dce8ee",
      }}
    >
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={42} radius="md" variant="light" color="cyan">
              <Icon size={22} />
            </ThemeIcon>
            <div>
              <Text fw={600}>{indicator.title}</Text>
              <Text size="sm" c="dimmed">
                {indicator.unit}
              </Text>
            </div>
          </Group>
          <IndicatorInfoPopover indicator={indicator} />
        </Group>

        <div>
          <Group gap={6} align="flex-end">
            <Text size="2.5rem" fw={700} lh={1}>
              {indicator.value}
            </Text>
          </Group>
          {indicator.trend ? (
            <Text size="sm" c="dimmed" mt={6}>
              {indicator.trend}
            </Text>
          ) : null}
        </div>

        <Paper radius="md" p="sm" style={{ backgroundColor: "#f5fafc" }}>
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              {indicator.absoluteSummary}
            </Text>
            {indicator.detailRows.map((row) => (
              <Text size="sm" c="dimmed" key={row}>
                {row}
              </Text>
            ))}
          </Stack>
        </Paper>

        <Text size="xs" c="dimmed" mt="auto">
          {indicator.referenceNote}
        </Text>
      </Stack>
    </Paper>
  );
}

function IndicatorInfoPopover({ indicator }: { indicator: IndicatorViewModel }) {
  return (
    <Popover width={280} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Informações sobre ${indicator.title}`}
        >
          <IconInfoCircle size={18} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text fw={600}>{indicator.title}</Text>
          <Text size="sm" c="dimmed">
            {indicator.definition}
          </Text>
          <Divider />
          <InfoRow label="Fórmula" value={indicator.formula} />
          <InfoRow label="Numerador" value={indicator.numerator} />
          <InfoRow label="Denominador" value={indicator.denominator} />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </div>
  );
}

function DashboardSeriesChart({
  series,
  isMobileLayout,
  onPointClick,
}: {
  series: DashboardSeriesPayload;
  isMobileLayout: boolean;
  onPointClick: (periodId: number) => void;
}) {
  const values = series.points.map((point) => point.value).filter((value): value is number => value !== null);
  const [activePeriodId, setActivePeriodId] = useState<number | null>(series.points.at(-1)?.reporting_period_id ?? null);

  useEffect(() => {
    setActivePeriodId(series.points.at(-1)?.reporting_period_id ?? null);
  }, [series]);

  if (!series.points.length) {
    return (
      <Text size="sm" c="dimmed">
        Nenhum ponto disponível para este indicador no intervalo selecionado.
      </Text>
    );
  }

  if (!values.length) {
    return (
      <Text size="sm" c="dimmed">
        O indicador não possui denominador válido no intervalo selecionado.
      </Text>
    );
  }

  const width = 900;
  const height = 300;
  const padding = { top: 28, right: 24, bottom: 52, left: 48 };
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const safeRange = maxValue - minValue || 1;
  const activePoint =
    series.points.find((point) => point.reporting_period_id === activePeriodId) ?? series.points[series.points.length - 1];
  const gridValues = Array.from({ length: 4 }, (_, index) => minValue + (safeRange / 3) * index).reverse();

  const points = series.points.map((point, index) => {
    const x =
      padding.left +
      ((width - padding.left - padding.right) / Math.max(series.points.length - 1, 1)) * index;
    const normalizedValue = point.value ?? minValue;
    const y =
      height -
      padding.bottom -
      ((normalizedValue - minValue) / safeRange) * (height - padding.top - padding.bottom);

    return {
      ...point,
      x,
      y,
    };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper radius="md" p="md" style={{ backgroundColor: "#f7fafc" }}>
          <Text size="xs" tt="uppercase" fw={700} c="cyan.8">
            Leitura do ponto
          </Text>
          <Text fw={700} mt={4}>
            {activePoint.label}
          </Text>
          <Text size="1.8rem" fw={700} lh={1.1} mt="xs">
            {formatPercentage(activePoint.value)}
          </Text>
          <Stack gap={4} mt="sm">
            {activePoint.base_data.map((datum) => (
              <Text size="sm" c="dimmed" key={`${activePoint.reporting_period_id}-${datum.field}`}>
                {datum.label}: {formatAbsoluteNumber(datum.value)}
              </Text>
            ))}
          </Stack>
        </Paper>
        <Paper radius="md" p="md" style={{ backgroundColor: "#ffffff", border: "1px solid #e6eef2" }}>
          <Text size="sm" c="dimmed">
            Clique em um ponto ou use a lista de períodos abaixo para abrir as coletas consolidadas correspondentes.
          </Text>
        </Paper>
      </SimpleGrid>

      <Box style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Série temporal de ${series.indicator_name}`}
          style={{ width: "100%", minWidth: isMobileLayout ? 0 : 640, height: "auto" }}
        >
          {gridValues.map((gridValue) => {
            const y =
              height -
              padding.bottom -
              ((gridValue - minValue) / safeRange) * (height - padding.top - padding.bottom);

            return (
              <g key={gridValue}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e1e8ed"
                  strokeWidth="1"
                />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#5c6b73">
                  {formatPercentageValue(gridValue)}
                </text>
              </g>
            );
          })}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#94a6b0"
            strokeWidth="1"
          />
          <polyline fill="none" stroke="#1c7ed6" strokeWidth="3" points={polyline} />
          {points.map((point) => (
            <g key={point.reporting_period_id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.reporting_period_id === activePoint.reporting_period_id ? "7" : "6"}
                fill={point.reporting_period_id === activePoint.reporting_period_id ? "#0c8599" : "#1c7ed6"}
                stroke="#ffffff"
                strokeWidth="2"
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label={`Abrir coletas de ${point.label}`}
                onMouseEnter={() => setActivePeriodId(point.reporting_period_id)}
                onFocus={() => setActivePeriodId(point.reporting_period_id)}
                onClick={() => onPointClick(point.reporting_period_id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPointClick(point.reporting_period_id);
                  }
                }}
              >
                <title>
                  {point.label}: {formatPercentage(point.value)}
                </title>
              </circle>
              <text x={point.x} y={height - 18} textAnchor="middle" fontSize="12" fill="#5c6b73">
                {shortPeriodLabel(point.label)}
              </text>
            </g>
          ))}
        </svg>
      </Box>

      <Group gap="xs">
        {series.points.map((point) => (
          <Button
            key={point.reporting_period_id}
            data-testid={`dashboard-series-point-${point.reporting_period_id}`}
            variant={point.reporting_period_id === activePoint.reporting_period_id ? "light" : "subtle"}
            size="xs"
            onMouseEnter={() => setActivePeriodId(point.reporting_period_id)}
            onFocus={() => setActivePeriodId(point.reporting_period_id)}
            onClick={() => onPointClick(point.reporting_period_id)}
          >
            {point.label}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}

function ConsolidatedDataSection({
  isMobileLayout,
  rows,
  onOpenPeriod,
}: {
  isMobileLayout: boolean | undefined;
  rows: DashboardTableRowPayload[];
  onOpenPeriod: (periodId: number) => void;
}) {
  if (isMobileLayout) {
    return (
      <Stack gap="sm">
        {rows.map((row) => (
          <Paper key={row.reporting_period_id} radius="lg" p="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={700}>{row.label}</Text>
                  <Text size="sm" c="dimmed">
                    {row.trace.submission_count} coleta(s) consolidadas
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="light"
                  data-testid={`dashboard-open-period-${row.reporting_period_id}`}
                  rightSection={<IconChevronRight size={14} />}
                  onClick={() => onOpenPeriod(row.reporting_period_id)}
                >
                  Ver coletas
                </Button>
              </Group>
              <SimpleGrid cols={3} spacing="sm">
                <CompactReading label="% voluntárias" value={formatPercentage(row.percentual_doacoes_voluntarias)} />
                <CompactReading label="% inaptidão" value={formatPercentage(row.taxa_inaptidao_clinica)} />
                <CompactReading label="% reatividade" value={formatPercentage(row.taxa_reatividade)} />
              </SimpleGrid>
              <Accordion variant="separated" radius="md">
                <Accordion.Item value="details">
                  <Accordion.Control>Ver detalhes</Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={4}>
                      <Text size="sm">Doações: {formatAbsoluteNumber(row.donacoes_voluntarias + row.donacoes_reposicao)}</Text>
                      <Text size="sm">Candidatos: {formatAbsoluteNumber(row.candidatos_aptos + row.candidatos_inaptos)}</Text>
                      <Text size="sm">Testadas: {formatAbsoluteNumber(row.amostras_testadas)}</Text>
                      {row.trace.records.length ? (
                        <>
                          <Divider my={4} />
                          <Text size="sm" fw={600}>
                            Rastreabilidade
                          </Text>
                          {row.trace.records.map((record) => (
                            <TraceRecordLine key={record.version_uuid} record={record} />
                          ))}
                        </>
                      ) : null}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <Box style={{ overflowX: "auto" }}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Período</Table.Th>
            <Table.Th>Coletas</Table.Th>
            <Table.Th>Doações</Table.Th>
            <Table.Th>% voluntárias</Table.Th>
            <Table.Th>Candidatos</Table.Th>
            <Table.Th>% inaptidão</Table.Th>
            <Table.Th>Testadas</Table.Th>
            <Table.Th>% reatividade</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.reporting_period_id}>
              <Table.Td>
                <Text fw={600}>{row.label}</Text>
              </Table.Td>
              <Table.Td>{formatAbsoluteNumber(row.trace.submission_count)}</Table.Td>
              <Table.Td>{formatAbsoluteNumber(row.donacoes_voluntarias + row.donacoes_reposicao)}</Table.Td>
              <Table.Td>{formatPercentage(row.percentual_doacoes_voluntarias)}</Table.Td>
              <Table.Td>{formatAbsoluteNumber(row.candidatos_aptos + row.candidatos_inaptos)}</Table.Td>
              <Table.Td>{formatPercentage(row.taxa_inaptidao_clinica)}</Table.Td>
              <Table.Td>{formatAbsoluteNumber(row.amostras_testadas)}</Table.Td>
              <Table.Td>{formatPercentage(row.taxa_reatividade)}</Table.Td>
              <Table.Td>
                <Button
                  size="xs"
                  variant="subtle"
                  data-testid={`dashboard-open-period-${row.reporting_period_id}`}
                  onClick={() => onOpenPeriod(row.reporting_period_id)}
                >
                  Ver coletas
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

function TraceRecordLine({ record }: { record: DashboardTraceRecord }) {
  return (
    <Text size="sm" c="dimmed">
      {formatDate(record.collection_date)} · v{record.version_number} · recebido em {formatDateTime(record.received_at)}
    </Text>
  );
}

function CompactReading({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={700}>{value}</Text>
    </div>
  );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="lg">
        {value}
      </Text>
    </div>
  );
}

function buildContextItems(
  bootstrapData: NonNullable<ReturnType<typeof useBootstrap>["data"]>,
  dashboardData: Awaited<ReturnType<typeof dashboardService.getDashboard>> | undefined,
) {
  return [
    {
      label: "Unidade",
      value: dashboardData?.summary.unit.name ?? bootstrapData.unit?.name ?? "Não definida",
    },
    {
      label: "Período",
      value: dashboardData?.summary.period_analyzed ?? bootstrapData.reportingPeriod?.label ?? "Não definido",
    },
    {
      label: "Coletas",
      value: String(dashboardData?.summary.collections_received ?? 0),
    },
    {
      label: "Atualização",
      value: formatDateTime(dashboardData?.summary.last_updated ?? null),
    },
  ];
}

function summarizeVolumes(rows: DashboardTableRowPayload[]) {
  return rows.reduce(
    (summary, row) => ({
      collections: summary.collections + row.trace.submission_count,
      periods: summary.periods + 1,
      donations: summary.donations + row.donacoes_voluntarias + row.donacoes_reposicao,
      screenedCandidates: summary.screenedCandidates + row.candidatos_aptos + row.candidatos_inaptos,
      testedSamples: summary.testedSamples + row.amostras_testadas,
    }),
    {
      collections: 0,
      periods: 0,
      donations: 0,
      screenedCandidates: 0,
      testedSamples: 0,
    },
  );
}

function buildIndicatorViewModel(
  indicator: DashboardIndicatorPayload,
  series: DashboardSeriesPayload | undefined,
): IndicatorViewModel {
  const meta = getIndicatorMeta(indicator.code);
  const trend = calculateTrendLabel(series);

  return {
    code: indicator.code,
    title: indicator.name,
    value: formatPercentage(indicator.value),
    unit: indicator.unit === "%" ? "Percentual consolidado" : indicator.unit,
    referenceNote: indicator.reference_note || "Sem referência definida",
    absoluteSummary: buildAbsoluteSummary(indicator.code, indicator.base_data),
    detailRows: buildDetailRows(indicator.code, indicator.base_data),
    definition: meta.definition,
    formula: meta.formula,
    numerator: meta.numerator,
    denominator: meta.denominator,
    trend,
    icon: meta.icon,
  };
}

function getIndicatorMeta(code: string) {
  switch (code) {
    case "percentual_doacoes_voluntarias":
      return {
        icon: IconDroplet,
        definition: "Mede a participação das doações voluntárias no total de doações registradas no período.",
        formula: "Doações voluntárias / Total de doações x 100",
        numerator: "Doações voluntárias",
        denominator: "Doações voluntárias + doações de reposição",
      };
    case "taxa_inaptidao_clinica":
      return {
        icon: IconStethoscope,
        definition: "Mede a proporção de candidatos considerados inaptos durante a triagem clínica.",
        formula: "Candidatos inaptos / Total de candidatos triados x 100",
        numerator: "Candidatos inaptos",
        denominator: "Candidatos aptos + candidatos inaptos",
      };
    default:
      return {
        icon: IconFlask2,
        definition: "Mede a proporção de amostras ou bolsas com resultado reagente entre as testadas no período.",
        formula: "Amostras reagentes / Amostras testadas x 100",
        numerator: "Amostras reagentes",
        denominator: "Amostras testadas",
      };
  }
}

function buildAbsoluteSummary(code: string, baseData: DashboardIndicatorBaseDatum[]) {
  const values = new Map(baseData.map((item) => [item.field, item.value]));

  switch (code) {
    case "percentual_doacoes_voluntarias": {
      const voluntary = values.get("donacoes_voluntarias") ?? 0;
      const replacement = values.get("donacoes_reposicao") ?? 0;
      return `${formatAbsoluteNumber(voluntary)} de ${formatAbsoluteNumber(voluntary + replacement)} doações`;
    }
    case "taxa_inaptidao_clinica": {
      const fit = values.get("candidatos_aptos") ?? 0;
      const unfit = values.get("candidatos_inaptos") ?? 0;
      return `${formatAbsoluteNumber(unfit)} de ${formatAbsoluteNumber(fit + unfit)} candidatos`;
    }
    default: {
      const tested = values.get("amostras_testadas") ?? 0;
      const reactive = values.get("amostras_reagentes") ?? 0;
      return `${formatAbsoluteNumber(reactive)} de ${formatAbsoluteNumber(tested)} amostras`;
    }
  }
}

function buildDetailRows(code: string, baseData: DashboardIndicatorBaseDatum[]) {
  const values = new Map(baseData.map((item) => [item.field, item.value]));

  switch (code) {
    case "percentual_doacoes_voluntarias":
      return [
        `${formatAbsoluteNumber(values.get("donacoes_voluntarias") ?? 0)} voluntárias`,
        `${formatAbsoluteNumber(values.get("donacoes_reposicao") ?? 0)} de reposição`,
      ];
    case "taxa_inaptidao_clinica":
      return [
        `${formatAbsoluteNumber(values.get("candidatos_inaptos") ?? 0)} inaptos`,
        `${formatAbsoluteNumber(values.get("candidatos_aptos") ?? 0)} aptos`,
      ];
    default:
      return [
        `${formatAbsoluteNumber(values.get("amostras_reagentes") ?? 0)} reagentes`,
        `${formatAbsoluteNumber(values.get("amostras_testadas") ?? 0)} testadas`,
      ];
  }
}

function calculateTrendLabel(series: DashboardSeriesPayload | undefined) {
  if (!series) {
    return null;
  }

  const comparablePoints = series.points.filter((point) => point.value !== null);
  if (comparablePoints.length < 2) {
    return null;
  }

  const lastPoint = comparablePoints[comparablePoints.length - 1];
  const previousPoint = comparablePoints[comparablePoints.length - 2];
  const delta = (lastPoint.value ?? 0) - (previousPoint.value ?? 0);
  const prefix = delta >= 0 ? "+" : "";

  return `${prefix}${delta.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} p.p. vs. ${previousPoint.label}`;
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "Sem base válida";
  }

  return `${formatPercentageValue(value)}%`;
}

function formatPercentageValue(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatAbsoluteNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem atualização";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Data não informada";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function shortPeriodLabel(label: string) {
  const [month, year] = label.split("/");
  return `${month.slice(0, 3)}/${year}`;
}

function comparePeriodsAsc(
  left: { reference_year: number; reference_month: number },
  right: { reference_year: number; reference_month: number },
) {
  return left.reference_year - right.reference_year || left.reference_month - right.reference_month;
}
