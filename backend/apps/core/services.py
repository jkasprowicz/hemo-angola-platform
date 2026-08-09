import datetime
import os
from calendar import monthrange
from typing import Iterable, Optional, Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.core.models import Institution, Unit, UserProfile
from apps.submissions.models import (
    AuditEvent,
    CollectionModule,
    CollectionVariable,
    IndicatorDefinition,
    ReportingPeriod,
    Submission,
)


User = get_user_model()

DEMO_INSTITUTION_NAME = "Instituição Demonstrativa HEMO-ANGOLA"
DEMO_UNIT_CODE = "DEMO-UNIT-01"
DEMO_USERNAMES = ("operador", "revisor", "gestor", "admin")
DEMO_MONTH_LABELS = (
    "Janeiro",
    "Fevereiro",
    "Marco",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
)


def get_demo_password() -> str:
    password = os.getenv("DJANGO_DEMO_PASSWORD", "").strip()
    if not password:
        raise ValueError(
            "DJANGO_DEMO_PASSWORD must be provided to create or reset demo credentials."
        )
    return password


def build_demo_users(unit: Optional[Unit], password: str) -> Iterable[Tuple[str, str, str, Optional[Unit]]]:
    return [
        ("operador", password, UserProfile.ROLE_OPERATOR, unit),
        ("revisor", password, UserProfile.ROLE_REVIEWER, unit),
        ("gestor", password, UserProfile.ROLE_MANAGER, None),
        ("admin", password, UserProfile.ROLE_ADMIN, unit),
    ]


def _delete_demo_catalog() -> None:
    IndicatorDefinition.objects.filter(is_demo=True).delete()
    CollectionVariable.objects.filter(is_demo=True).delete()
    CollectionModule.objects.filter(is_demo=True).delete()


def _delete_demo_operational_data() -> None:
    Submission.objects.filter(institution__is_demo=True).delete()
    ReportingPeriod.objects.filter(is_demo=True).delete()
    AuditEvent.objects.filter(actor__username__in=DEMO_USERNAMES).delete()


def _delete_demo_identity_data() -> None:
    UserProfile.objects.filter(
        user__username__in=DEMO_USERNAMES,
    ).delete()
    Unit.objects.filter(is_demo=True).delete()
    Institution.objects.filter(is_demo=True).delete()
    User.objects.filter(username__in=DEMO_USERNAMES).delete()


@transaction.atomic
def reset_demo_data() -> None:
    _delete_demo_operational_data()
    _delete_demo_catalog()
    _delete_demo_identity_data()


@transaction.atomic
def ensure_demo_data() -> None:
    existing_demo_institutions = Institution.objects.filter(is_demo=True)
    existing_demo_units = Unit.objects.filter(is_demo=True)

    # Recover automatically from stale demo duplicates before rebuilding the baseline.
    if existing_demo_institutions.count() > 1 or existing_demo_units.count() > 1:
      reset_demo_data()
    elif (
        existing_demo_institutions.count() == 0
        and (
            existing_demo_units.exists()
            or ReportingPeriod.objects.filter(is_demo=True).exists()
            or UserProfile.objects.filter(user__username__in=DEMO_USERNAMES).exists()
        )
    ):
        reset_demo_data()

    institution, _ = Institution.objects.update_or_create(
        name=DEMO_INSTITUTION_NAME,
        defaults={"is_demo": True},
    )
    unit, _ = Unit.objects.update_or_create(
        code=DEMO_UNIT_CODE,
        defaults={
            "institution": institution,
            "name": "Unidade Demonstrativa",
            "is_demo": True,
        },
    )
    if unit.institution_id != institution.id:
        unit.institution = institution
        unit.name = "Unidade Demonstrativa"
        unit.is_demo = True
        unit.save(update_fields=["institution", "name", "is_demo"])

    current_reference = timezone.now().date().replace(day=1)
    iter_reference = settings.REPORTING_PERIOD_MIN
    while iter_reference <= settings.REPORTING_PERIOD_MAX:
        month_name = DEMO_MONTH_LABELS[iter_reference.month - 1]
        last_day = monthrange(iter_reference.year, iter_reference.month)[1]
        ReportingPeriod.objects.update_or_create(
            institution=institution,
            unit=unit,
            reference_year=iter_reference.year,
            reference_month=iter_reference.month,
            defaults={
                "label": f"{month_name}/{iter_reference.year}",
                "start_date": datetime.date(iter_reference.year, iter_reference.month, 1),
                "end_date": datetime.date(iter_reference.year, iter_reference.month, last_day),
                "status": ReportingPeriod.STATUS_OPEN if iter_reference >= current_reference else ReportingPeriod.STATUS_CLOSED,
                "is_demo": True,
            },
        )
        if iter_reference.month == 12:
            iter_reference = datetime.date(iter_reference.year + 1, 1, 1)
        else:
            iter_reference = datetime.date(iter_reference.year, iter_reference.month + 1, 1)

    valid_from = datetime.date(2026, 8, 1)
    demo_notice = (
        "Configuração demonstrativa. Os indicadores definitivos serão priorizados "
        "e validados em conjunto com o Instituto Nacional de Sangue."
    )

    _delete_demo_catalog()

    modules = {
        "donation_capture": CollectionModule.objects.create(
            code="donation_capture",
            name="Doação e captação",
            description="Informe apenas totais agregados do período para doações voluntárias e de reposição.",
            display_order=1,
            active=True,
            version=1,
            valid_from=valid_from,
            is_demo=True,
        ),
        "clinical_screening": CollectionModule.objects.create(
            code="clinical_screening",
            name="Triagem clínica",
            description="Registre os totais agregados de candidatos aptos e inaptos na triagem clínica do período.",
            display_order=2,
            active=True,
            version=1,
            valid_from=valid_from,
            is_demo=True,
        ),
        "laboratory_screening": CollectionModule.objects.create(
            code="laboratory_screening",
            name="Triagem laboratorial",
            description="Registre o total agregado de amostras ou bolsas testadas e o total reagente para um ou mais marcadores.",
            display_order=3,
            active=True,
            version=1,
            valid_from=valid_from,
            is_demo=True,
        ),
    }

    variables = {
        "donacoes_voluntarias": CollectionVariable.objects.create(
            code="donacoes_voluntarias",
            name="Doações voluntárias/espontâneas",
            operational_definition="Quantidade agregada de doações voluntárias ou espontâneas registradas na unidade no período.",
            module=modules["donation_capture"],
            variable_type=CollectionVariable.TYPE_INTEGER,
            unit="doações",
            required=True,
            min_value=0,
            expected_source="Registro institucional da unidade.",
            help_text="Use apenas dados institucionais agregados; não informe dados individuais.",
            display_order=1,
            active=True,
            version=1,
            is_demo=True,
        ),
        "donacoes_reposicao": CollectionVariable.objects.create(
            code="donacoes_reposicao",
            name="Doações de reposição",
            operational_definition="Quantidade agregada de doações de reposição registradas na unidade no período.",
            module=modules["donation_capture"],
            variable_type=CollectionVariable.TYPE_INTEGER,
            unit="doações",
            required=True,
            min_value=0,
            expected_source="Registro institucional da unidade.",
            help_text="Use apenas dados institucionais agregados; não informe dados individuais.",
            display_order=2,
            active=True,
            version=1,
            is_demo=True,
        ),
        "candidatos_aptos": CollectionVariable.objects.create(
            code="candidatos_aptos",
            name="Candidatos aptos",
            operational_definition="Quantidade agregada de candidatos considerados aptos na triagem clínica do período.",
            module=modules["clinical_screening"],
            variable_type=CollectionVariable.TYPE_INTEGER,
            unit="candidatos",
            required=True,
            min_value=0,
            expected_source="Registro de triagem clínica da unidade.",
            help_text="Use apenas dados institucionais agregados; não informe dados individuais.",
            display_order=1,
            active=True,
            version=1,
            is_demo=True,
        ),
        "candidatos_inaptos": CollectionVariable.objects.create(
            code="candidatos_inaptos",
            name="Candidatos inaptos",
            operational_definition="Quantidade agregada de candidatos considerados inaptos na triagem clínica do período.",
            module=modules["clinical_screening"],
            variable_type=CollectionVariable.TYPE_INTEGER,
            unit="candidatos",
            required=True,
            min_value=0,
            expected_source="Registro de triagem clínica da unidade.",
            help_text="Use apenas dados institucionais agregados; não informe dados individuais.",
            display_order=2,
            active=True,
            version=1,
            is_demo=True,
        ),
        "amostras_testadas": CollectionVariable.objects.create(
            code="amostras_testadas",
            name="Amostras/bolsas testadas",
            operational_definition="Quantidade agregada de amostras ou bolsas testadas na triagem laboratorial no período.",
            module=modules["laboratory_screening"],
            variable_type=CollectionVariable.TYPE_INTEGER,
            unit="amostras/bolsas",
            required=True,
            min_value=0,
            expected_source="Registro laboratorial da unidade.",
            help_text="Use apenas totais agregados do período.",
            display_order=1,
            active=True,
            version=1,
            is_demo=True,
        ),
        "amostras_reagentes": CollectionVariable.objects.create(
            code="amostras_reagentes",
            name="Amostras/bolsas reagentes para um ou mais marcadores",
            operational_definition="Quantidade agregada de amostras ou bolsas reagentes para um ou mais marcadores na triagem laboratorial do período.",
            module=modules["laboratory_screening"],
            variable_type=CollectionVariable.TYPE_INTEGER,
            unit="amostras/bolsas",
            required=True,
            min_value=0,
            expected_source="Registro laboratorial da unidade.",
            help_text="Use apenas totais agregados do período.",
            display_order=2,
            active=True,
            version=1,
            is_demo=True,
        ),
    }

    IndicatorDefinition.objects.create(
        code="percentual_doacoes_voluntarias",
        name="Percentual de doações voluntárias",
        definition="Percentual de doações voluntárias em relação ao total calculado de doações voluntárias e de reposição do período.",
        module=modules["donation_capture"],
        dimension=IndicatorDefinition.DIMENSION_PROCESS,
        unit="%",
        formula_kind=IndicatorDefinition.FORMULA_SHARE_OF_SUM_PERCENTAGE,
        formula_label="doações voluntárias ÷ (doações voluntárias + doações de reposição) × 100",
        numerator_variable=variables["donacoes_voluntarias"],
        denominator_variable=variables["donacoes_reposicao"],
        version=1,
        valid_from=valid_from,
        interpretation="Valores mais altos indicam maior participação de doações voluntárias no período.",
        is_demo=True,
    )
    IndicatorDefinition.objects.create(
        code="taxa_inaptidao_clinica",
        name="Taxa de inaptidão clínica",
        definition="Percentual de candidatos inaptos em relação ao total calculado de candidatos aptos e inaptos do período.",
        module=modules["clinical_screening"],
        dimension=IndicatorDefinition.DIMENSION_RESULT,
        unit="%",
        formula_kind=IndicatorDefinition.FORMULA_SHARE_OF_SUM_PERCENTAGE,
        formula_label="candidatos inaptos ÷ (candidatos aptos + candidatos inaptos) × 100",
        numerator_variable=variables["candidatos_inaptos"],
        denominator_variable=variables["candidatos_aptos"],
        version=1,
        valid_from=valid_from,
        interpretation="Valores mais altos indicam maior proporção de inaptidão clínica entre os candidatos triados.",
        is_demo=True,
    )
    IndicatorDefinition.objects.create(
        code="taxa_reatividade",
        name="Taxa de reatividade",
        definition="Percentual de amostras ou bolsas reagentes em relação ao total de amostras ou bolsas testadas no período.",
        module=modules["laboratory_screening"],
        dimension=IndicatorDefinition.DIMENSION_RESULT,
        unit="%",
        formula_kind=IndicatorDefinition.FORMULA_RATIO_PERCENTAGE,
        formula_label="amostras reagentes ÷ amostras testadas × 100",
        numerator_variable=variables["amostras_reagentes"],
        denominator_variable=variables["amostras_testadas"],
        version=1,
        valid_from=valid_from,
        interpretation="Valores mais altos indicam maior proporção de reatividade no conjunto laboratorial testado.",
        is_demo=True,
    )

    demo_users = build_demo_users(unit, get_demo_password())

    for username, password, role, user_unit in demo_users:
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": role.title(),
                "last_name": "Demo",
                "is_staff": role == UserProfile.ROLE_ADMIN,
                "is_superuser": role == UserProfile.ROLE_ADMIN,
            },
        )
        fields_to_update = []
        if user.first_name != role.title():
            user.first_name = role.title()
            fields_to_update.append("first_name")
        if user.last_name != "Demo":
            user.last_name = "Demo"
            fields_to_update.append("last_name")
        if user.is_staff != (role == UserProfile.ROLE_ADMIN):
            user.is_staff = role == UserProfile.ROLE_ADMIN
            fields_to_update.append("is_staff")
        if user.is_superuser != (role == UserProfile.ROLE_ADMIN):
            user.is_superuser = role == UserProfile.ROLE_ADMIN
            fields_to_update.append("is_superuser")
        if fields_to_update:
            user.save(update_fields=fields_to_update)

        if created or not user.check_password(password):
            user.set_password(password)
            user.save()

        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "institution": institution,
                "unit": user_unit,
                "role": role,
            },
        )
