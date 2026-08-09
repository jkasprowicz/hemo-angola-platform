from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from apps.submissions.models import ReportingPeriod

from .queries import get_dashboard_versions


INDICATOR_DEFINITIONS = [
    {
        "code": "percentual_doacoes_voluntarias",
        "name": "Percentual de doações voluntárias",
        "numerator": "donacoes_voluntarias",
        "denominator_components": ("donacoes_voluntarias", "donacoes_reposicao"),
        "base_fields": (
            ("Voluntárias", "donacoes_voluntarias"),
            ("Reposição", "donacoes_reposicao"),
        ),
    },
    {
        "code": "taxa_inaptidao_clinica",
        "name": "Taxa de inaptidão clínica",
        "numerator": "candidatos_inaptos",
        "denominator_components": ("candidatos_aptos", "candidatos_inaptos"),
        "base_fields": (
            ("Aptos", "candidatos_aptos"),
            ("Inaptos", "candidatos_inaptos"),
        ),
    },
    {
        "code": "taxa_reatividade",
        "name": "Taxa de reatividade laboratorial",
        "numerator": "amostras_reagentes",
        "denominator_components": ("amostras_testadas",),
        "base_fields": (
            ("Testadas", "amostras_testadas"),
            ("Reagentes", "amostras_reagentes"),
        ),
    },
]


@dataclass
class AggregatedPeriodRow:
    reporting_period_id: int
    label: str
    reference_year: int
    reference_month: int
    totals: dict[str, Decimal]
    last_updated: str | None
    trace_records: list[dict[str, Any]]


def _to_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _safe_percentage(numerator: Decimal, denominator: Decimal) -> float | None:
    if denominator == 0:
        return None
    return round(float((numerator / denominator) * Decimal("100")), 2)


def _normalize_period_ids(period_from_id: int | None, period_to_id: int | None) -> tuple[list[int], ReportingPeriod | None, ReportingPeriod | None]:
    if not period_from_id and not period_to_id:
        return [], None, None

    period_from = ReportingPeriod.objects.filter(pk=period_from_id).first() if period_from_id else None
    period_to = ReportingPeriod.objects.filter(pk=period_to_id).first() if period_to_id else None

    if not period_from and not period_to:
        return [], None, None

    if period_from and not period_to:
        return [period_from.id], period_from, period_from

    if period_to and not period_from:
        return [period_to.id], period_to, period_to

    if period_from is None or period_to is None:
        return [], None, None

    selected_periods = list(ReportingPeriod.objects.order_by("reference_year", "reference_month"))
    selected_ids = [
        period.id
        for period in selected_periods
        if (
            (period.reference_year, period.reference_month) >= (period_from.reference_year, period_from.reference_month)
            and (period.reference_year, period.reference_month) <= (period_to.reference_year, period_to.reference_month)
        )
    ]
    return selected_ids, period_from, period_to


def _latest_versions(queryset):
    latest_by_submission: dict[int, Any] = {}
    for version in queryset:
        if version.submission_id not in latest_by_submission:
            latest_by_submission[version.submission_id] = version
    return list(latest_by_submission.values())


def _aggregate_rows(versions) -> list[AggregatedPeriodRow]:
    by_period: dict[int, AggregatedPeriodRow] = {}
    tracked_fields = {
        "donacoes_voluntarias",
        "donacoes_reposicao",
        "candidatos_aptos",
        "candidatos_inaptos",
        "amostras_testadas",
        "amostras_reagentes",
    }

    for version in versions:
        period = version.submission.reporting_period
        responses = version.payload.get("responses", {})
        row = by_period.get(period.id)
        if row is None:
            row = AggregatedPeriodRow(
                reporting_period_id=period.id,
                label=period.label,
                reference_year=period.reference_year,
                reference_month=period.reference_month,
                totals={field: Decimal("0") for field in tracked_fields},
                last_updated=version.synced_at.isoformat() if version.synced_at else version.created_at.isoformat(),
                trace_records=[],
            )
            by_period[period.id] = row

        for field in tracked_fields:
            numeric_value = _to_decimal(responses.get(field))
            if numeric_value is not None:
                row.totals[field] += numeric_value

        version_updated_at = version.synced_at.isoformat() if version.synced_at else version.created_at.isoformat()
        if row.last_updated is None or version_updated_at > row.last_updated:
            row.last_updated = version_updated_at

        row.trace_records.append(
            {
                "submission_id": version.submission.id,
                "submission_uuid": str(version.submission.client_submission_uuid),
                "version_id": version.id,
                "version_uuid": str(version.client_version_uuid),
                "version_number": version.version_number,
                "status": version.status,
                "received_at": version.synced_at.isoformat() if version.synced_at else version.created_at.isoformat(),
                "unit_id": version.submission.unit_id,
                "reporting_period_id": period.id,
            }
        )

    return sorted(by_period.values(), key=lambda row: (row.reference_year, row.reference_month))


def _build_indicator_payload(totals: dict[str, Decimal], definition: dict[str, Any]) -> dict[str, Any]:
    numerator = totals.get(definition["numerator"], Decimal("0"))
    denominator = sum((totals.get(field, Decimal("0")) for field in definition["denominator_components"]), Decimal("0"))
    return {
        "code": definition["code"],
        "name": definition["name"],
        "unit": "%",
        "value": _safe_percentage(numerator, denominator),
        "reference_note": "Sem referência definida",
        "base_data": [
            {
                "label": label,
                "field": field,
                "value": int(totals.get(field, Decimal("0"))),
            }
            for label, field in definition["base_fields"]
        ],
    }


def build_dashboard_payload(*, unit_id: int | None = None, period_from_id: int | None = None, period_to_id: int | None = None):
    period_ids, normalized_from, normalized_to = _normalize_period_ids(period_from_id, period_to_id)
    versions = _latest_versions(get_dashboard_versions(unit_id=unit_id, period_ids=period_ids))
    rows = _aggregate_rows(versions)

    total_tallies = {
        "donacoes_voluntarias": Decimal("0"),
        "donacoes_reposicao": Decimal("0"),
        "candidatos_aptos": Decimal("0"),
        "candidatos_inaptos": Decimal("0"),
        "amostras_testadas": Decimal("0"),
        "amostras_reagentes": Decimal("0"),
    }
    for row in rows:
        for field, value in row.totals.items():
            total_tallies[field] += value

    first_row = rows[0] if rows else None
    last_row = rows[-1] if rows else None
    selected_unit = versions[0].submission.unit if versions else None
    last_updated = max((row.last_updated for row in rows if row.last_updated is not None), default=None)

    indicators = [_build_indicator_payload(total_tallies, definition) for definition in INDICATOR_DEFINITIONS]

    series = []
    table = []
    for definition in INDICATOR_DEFINITIONS:
        points = []
        for row in rows:
            numerator = row.totals.get(definition["numerator"], Decimal("0"))
            denominator = sum((row.totals.get(field, Decimal("0")) for field in definition["denominator_components"]), Decimal("0"))
            points.append(
                {
                    "reporting_period_id": row.reporting_period_id,
                    "label": row.label,
                    "reference_year": row.reference_year,
                    "reference_month": row.reference_month,
                    "value": _safe_percentage(numerator, denominator),
                    "base_data": [
                        {
                            "label": label,
                            "field": field,
                            "value": int(row.totals.get(field, Decimal("0"))),
                        }
                        for label, field in definition["base_fields"]
                    ],
                    "trace_records": row.trace_records,
                }
            )
        series.append(
            {
                "indicator_code": definition["code"],
                "indicator_name": definition["name"],
                "unit": "%",
                "points": points,
            }
        )

    for row in rows:
        table.append(
            {
                "reporting_period_id": row.reporting_period_id,
                "label": row.label,
                "reference_year": row.reference_year,
                "reference_month": row.reference_month,
                "donacoes_voluntarias": int(row.totals["donacoes_voluntarias"]),
                "donacoes_reposicao": int(row.totals["donacoes_reposicao"]),
                "percentual_doacoes_voluntarias": _safe_percentage(
                    row.totals["donacoes_voluntarias"],
                    row.totals["donacoes_voluntarias"] + row.totals["donacoes_reposicao"],
                ),
                "candidatos_aptos": int(row.totals["candidatos_aptos"]),
                "candidatos_inaptos": int(row.totals["candidatos_inaptos"]),
                "taxa_inaptidao_clinica": _safe_percentage(
                    row.totals["candidatos_inaptos"],
                    row.totals["candidatos_aptos"] + row.totals["candidatos_inaptos"],
                ),
                "amostras_testadas": int(row.totals["amostras_testadas"]),
                "amostras_reagentes": int(row.totals["amostras_reagentes"]),
                "taxa_reatividade": _safe_percentage(
                    row.totals["amostras_reagentes"],
                    row.totals["amostras_testadas"],
                ),
                "trace": {
                    "submission_count": len(row.trace_records),
                    "last_updated": row.last_updated,
                    "records": row.trace_records,
                },
            }
        )

    return {
        "filters": {
            "unit_id": unit_id or getattr(selected_unit, "id", None),
            "period_from": normalized_from.id if normalized_from else first_row.reporting_period_id if first_row else None,
            "period_to": normalized_to.id if normalized_to else last_row.reporting_period_id if last_row else None,
        },
        "summary": {
            "collections_received": len(versions),
            "period_analyzed": (
                f"{first_row.label} – {last_row.label}"
                if first_row and last_row and first_row.reporting_period_id != last_row.reporting_period_id
                else first_row.label
                if first_row
                else "Sem dados"
            ),
            "last_updated": last_updated,
            "unit": {
                "id": getattr(selected_unit, "id", unit_id),
                "name": getattr(selected_unit, "name", "Unidade não definida"),
            },
            "workflow_note": "O dashboard MVP considera dados tecnicamente recebidos pelo servidor. O aceite institucional definitivo permanece TO-BE.",
        },
        "indicators": indicators,
        "series": series,
        "table": table,
        "empty": len(rows) == 0,
    }
