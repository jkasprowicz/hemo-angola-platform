import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useBootstrap } from "../../../hooks/useBootstrap";
import { useSession } from "../../../hooks/useSession";
import { dashboardService } from "../../../services/dashboardService";
import type { DashboardIndicatorPayload, DashboardSeriesPayload } from "../../../types/api";


const INDICATOR_ORDER = [
  "percentual_doacoes_voluntarias",
  "taxa_inaptidao_clinica",
  "taxa_reatividade",
];


export function DashboardPage() {
  const session = useSession();
  const bootstrap = useBootstrap(session.data?.authenticated === true);
  const navigate = useNavigate();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPeriodFrom, setSelectedPeriodFrom] = useState<string | null>(null);
  const [selectedPeriodTo, setSelectedPeriodTo] = useState<string | null>(null);
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState<string>(INDICATOR_ORDER[0]);

  useEffect(() => {
    if (!bootstrap.data) {
      return;
    }

    const periodsAscending = [...bootstrap.data.reportingPeriods].sort(comparePeriodsAsc);
    const firstPeriod = periodsAscending[0];
    const defaultTo = bootstrap.data.reportingPeriod ?? periodsAscending[periodsAscending.length - 1] ?? null;

    setSelectedUnitId(String(bootstrap.data.unit?.id ?? ""));
    setSelectedPeriodFrom(firstPeriod ? String(firstPeriod.id) : null);
    setSelectedPeriodTo(defaultTo ? String(defaultTo.id) : null);
  }, [bootstrap.data]);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", selectedUnitId, selectedPeriodFrom, selectedPeriodTo],
    queryFn: () =>
      dashboardService.getDashboard({
        unitId: selectedUnitId ? Number(selectedUnitId) : null,
        periodFrom: selectedPeriodFrom ? Number(selectedPeriodFrom) : null,
        periodTo: selectedPeriodTo ? Number(selectedPeriodTo) : null,
      }),
    enabled: Boolean(bootstrap.data && selectedPeriodFrom && selectedPeriodTo),
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
      (left, right) => INDICATOR_ORDER.indexOf(left.code) - INDICATOR_ORDER.indexOf(right.code),
    );
  }, [dashboardQuery.data?.indicators]);
  const selectedSeries = useMemo(
    () =>
      dashboardQuery.data?.series.find((series) => series.indicator_code === selectedIndicatorCode) ??
      dashboardQuery.data?.series[0] ??
      null,
    [dashboardQuery.data?.series, selectedIndicatorCode],
  );

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
    <Stack gap="lg">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Text size="xl" fw={700}>
                Painel analítico do MVP
              </Text>
              <Text c="dimmed">
                Ambiente dedicado para análise de indicadores a partir de dados sincronizados e tecnicamente recebidos no servidor.
              </Text>
            </div>
            <Badge variant="light" color="blue" size="lg">
              Dashboard MVP
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <ContextItem label="Unidade em foco" value={bootstrap.data.unit?.name ?? "Não definida"} />
            <ContextItem
              label="Período operacional padrão"
              value={bootstrap.data.reportingPeriod?.label ?? "Não definido"}
            />
            <ContextItem
              label="Janela demonstrativa"
              value={bootstrap.data.reportingPeriodPolicy ? "Configurada" : "Não informada"}
            />
          </SimpleGrid>
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text fw={600}>Filtros</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            <Select
              label="Unidade"
              data={unitOptions}
              value={selectedUnitId}
              onChange={setSelectedUnitId}
              allowDeselect={false}
            />
            <Select
              label="Período inicial"
              data={periodOptions}
              value={selectedPeriodFrom}
              onChange={setSelectedPeriodFrom}
              allowDeselect={false}
            />
            <Select
              label="Período final"
              data={periodOptions}
              value={selectedPeriodTo}
              onChange={setSelectedPeriodTo}
              allowDeselect={false}
            />
          </SimpleGrid>
        </Stack>
      </Card>

      {dashboardQuery.isLoading ? <DashboardLoadingState /> : null}

      {dashboardQuery.isError ? (
        <Alert color="red" title="Não foi possível carregar o dashboard.">
          <Group justify="space-between" align="center">
            <Text size="sm">Revise os filtros e tente novamente.</Text>
            <Button variant="light" onClick={() => void dashboardQuery.refetch()}>
              Tentar novamente
            </Button>
          </Group>
        </Alert>
      ) : null}

      {dashboardQuery.data ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }}>
            <SummaryCard title="Coletas recebidas" value={String(dashboardQuery.data.summary.collections_received)} />
            <SummaryCard title="Período analisado" value={dashboardQuery.data.summary.period_analyzed} />
            <SummaryCard
              title="Última atualização"
              value={formatDateTime(dashboardQuery.data.summary.last_updated)}
            />
            <SummaryCard title="Unidade" value={dashboardQuery.data.summary.unit.name} />
          </SimpleGrid>

          <Alert color="blue" variant="light">
            {dashboardQuery.data.summary.workflow_note}
          </Alert>

          {dashboardQuery.data.empty ? (
            <Card withBorder radius="md">
              <Stack gap="xs">
                <Text fw={600}>Nenhum dado sincronizado para o intervalo selecionado</Text>
                <Text size="sm" c="dimmed">
                  O dashboard MVP usa apenas dados recebidos pelo backend. Rascunhos locais e registros ainda não enviados não entram neste painel.
                </Text>
              </Stack>
            </Card>
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, lg: 3 }}>
                {orderedIndicators.map((indicator) => (
                  <IndicatorCard key={indicator.code} indicator={indicator} />
                ))}
              </SimpleGrid>

              <Card withBorder radius="md">
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <div>
                      <Text fw={600}>Série temporal</Text>
                      <Text size="sm" c="dimmed">
                        Selecione um indicador e clique em um ponto para abrir os registros do período correspondente.
                      </Text>
                    </div>
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
                  </Group>
                  {selectedSeries ? (
                    <DashboardSeriesChart
                      series={selectedSeries}
                      onPointClick={(periodId) => navigate(`/registros?period=${periodId}&source=dashboard`)}
                    />
                  ) : null}
                </Stack>
              </Card>

              <Card withBorder radius="md">
                <Stack gap="sm">
                  <Text fw={600}>Tabela de consolidação por período</Text>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Período</Table.Th>
                        <Table.Th>Doações voluntárias</Table.Th>
                        <Table.Th>Doações de reposição</Table.Th>
                        <Table.Th>% voluntárias</Table.Th>
                        <Table.Th>Aptos</Table.Th>
                        <Table.Th>Inaptos</Table.Th>
                        <Table.Th>% inaptidão</Table.Th>
                        <Table.Th>Testadas</Table.Th>
                        <Table.Th>Reagentes</Table.Th>
                        <Table.Th>% reatividade</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {dashboardQuery.data.table.map((row) => (
                        <Table.Tr key={row.reporting_period_id}>
                          <Table.Td>
                            <Button
                              variant="subtle"
                              px={0}
                              onClick={() => navigate(`/registros?period=${row.reporting_period_id}&source=dashboard`)}
                            >
                              {row.label}
                            </Button>
                          </Table.Td>
                          <Table.Td>{row.donacoes_voluntarias}</Table.Td>
                          <Table.Td>{row.donacoes_reposicao}</Table.Td>
                          <Table.Td>{formatPercentage(row.percentual_doacoes_voluntarias)}</Table.Td>
                          <Table.Td>{row.candidatos_aptos}</Table.Td>
                          <Table.Td>{row.candidatos_inaptos}</Table.Td>
                          <Table.Td>{formatPercentage(row.taxa_inaptidao_clinica)}</Table.Td>
                          <Table.Td>{row.amostras_testadas}</Table.Td>
                          <Table.Td>{row.amostras_reagentes}</Table.Td>
                          <Table.Td>{formatPercentage(row.taxa_reatividade)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Card>
            </>
          )}
        </>
      ) : null}
    </Stack>
  );
}

function DashboardLoadingState() {
  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card withBorder radius="md" key={index}>
            <Skeleton height={16} mb="sm" />
            <Skeleton height={32} />
          </Card>
        ))}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card withBorder radius="md" key={index}>
            <Skeleton height={18} mb="sm" />
            <Skeleton height={28} mb="xs" />
            <Skeleton height={12} />
          </Card>
        ))}
      </SimpleGrid>
      <Card withBorder radius="md">
        <Group justify="center" py="xl">
          <Loader size="sm" />
          <Text size="sm">Carregando dados consolidados…</Text>
        </Group>
      </Card>
    </>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card withBorder radius="md" h="100%">
      <Text size="sm" c="dimmed">
        {title}
      </Text>
      <Text fw={700} size="lg">
        {value}
      </Text>
    </Card>
  );
}

function IndicatorCard({ indicator }: { indicator: DashboardIndicatorPayload }) {
  return (
    <Card withBorder radius="md" h="100%">
      <Stack gap="xs">
        <Text fw={600}>{indicator.name}</Text>
        <Text size="2rem" fw={700}>
          {formatPercentage(indicator.value)}
        </Text>
        {indicator.base_data.map((item) => (
          <Text size="sm" c="dimmed" key={item.field}>
            {item.label}: {item.value}
          </Text>
        ))}
        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
          {indicator.reference_note}
        </Text>
      </Stack>
    </Card>
  );
}

function DashboardSeriesChart({
  series,
  onPointClick,
}: {
  series: DashboardSeriesPayload;
  onPointClick: (periodId: number) => void;
}) {
  const values = series.points.map((point) => point.value).filter((value): value is number => value !== null);

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

  const width = 760;
  const height = 260;
  const padding = 32;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const safeRange = maxValue - minValue || 1;

  const points = series.points.map((point, index) => {
    const x = padding + ((width - padding * 2) / Math.max(series.points.length - 1, 1)) * index;
    const normalizedValue = point.value ?? minValue;
    const y = height - padding - ((normalizedValue - minValue) / safeRange) * (height - padding * 2);

    return {
      ...point,
      x,
      y,
    };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <Stack gap="xs">
      <Text fw={600}>{series.indicator_name}</Text>
      <Box style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Série temporal de ${series.indicator_name}`}
          style={{ width: "100%", minWidth: 640, height: "auto" }}
        >
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ced4da" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ced4da" strokeWidth="1" />
          <polyline fill="none" stroke="#1c4c7d" strokeWidth="3" points={polyline} />
          {points.map((point) => (
            <g key={point.reporting_period_id}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#1c4c7d"
                style={{ cursor: "pointer" }}
                onClick={() => onPointClick(point.reporting_period_id)}
              >
                <title>
                  {point.label}: {formatPercentage(point.value)}
                </title>
              </circle>
              <text x={point.x} y={height - 10} textAnchor="middle" fontSize="12" fill="#495057">
                {point.reference_month}/{String(point.reference_year).slice(2)}
              </text>
            </g>
          ))}
        </svg>
      </Box>
      <Text size="sm" c="dimmed">
        Agregação ponderada calculada no backend a partir das bases sincronizadas.
      </Text>
    </Stack>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </div>
  );
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "Sem base válida";
  }

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem atualização";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function comparePeriodsAsc(
  left: { reference_year: number; reference_month: number },
  right: { reference_year: number; reference_month: number },
) {
  return left.reference_year - right.reference_year || left.reference_month - right.reference_month;
}
