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

    module_specs = [
        (
            "clinical_screening",
            "Triagem clínica",
            "Instrumento demonstrativo de triagem e captação com dados-base agregados. A matriz definitiva permanece dependente de validação institucional.",
            1,
        ),
        (
            "collection_operations",
            "Coleta",
            "Base operacional agregada da sessão de coleta, sem dados individuais de doadores ou receptores.",
            2,
        ),
        (
            "laboratory_screening",
            "Exames realizados",
            "Estrutura demonstrativa para totais laboratoriais e registro agregado por exame.",
            3,
        ),
        (
            "hemotherapy_production",
            "Produção hemoterápica",
            "Estrutura tabular demonstrativa por hemocomponente para produção, recebimento e devolução.",
            4,
        ),
        (
            "transfusion_distribution",
            "Transfusão / distribuição",
            "Base agregada demonstrativa para transfusão e distribuição. Não representa matriz validada para Angola.",
            5,
        ),
    ]
    modules = {
        code: CollectionModule.objects.create(
            code=code,
            name=name,
            description=description,
            display_order=display_order,
            active=True,
            version=1,
            valid_from=valid_from,
            is_demo=True,
        )
        for code, name, description, display_order in module_specs
    }

    variable_specs = [
        ("donacoes_voluntarias", "Doações voluntárias/espontâneas", "Quantidade agregada de doações voluntárias ou espontâneas registradas na unidade no período.", "clinical_screening", "doações", True, 1, "Registro institucional da unidade.", "Use apenas dados institucionais agregados; não informe dados individuais."),
        ("donacoes_reposicao", "Doações de reposição", "Quantidade agregada de doações de reposição registradas na unidade no período.", "clinical_screening", "doações", True, 2, "Registro institucional da unidade.", "Use apenas dados institucionais agregados; não informe dados individuais."),
        ("candidatos_aptos", "Candidatos aptos", "Quantidade agregada de candidatos considerados aptos na triagem clínica do período.", "clinical_screening", "candidatos", True, 3, "Registro de triagem clínica da unidade.", "Use apenas dados institucionais agregados; não informe dados individuais."),
        ("candidatos_inaptos", "Candidatos inaptos", "Quantidade agregada de candidatos considerados inaptos na triagem clínica do período.", "clinical_screening", "candidatos", True, 4, "Registro de triagem clínica da unidade.", "Use apenas dados institucionais agregados; não informe dados individuais."),
        ("doador_primeira_vez", "Doadores de primeira vez", "Quantidade agregada demonstrativa de doadores de primeira vez.", "clinical_screening", "doadores", False, 5, "Registro de triagem clínica da unidade.", "Configuração demonstrativa / candidato; não representa categorização oficialmente validada para Angola."),
        ("doador_repeticao", "Doadores de repetição", "Quantidade agregada demonstrativa de doadores de repetição.", "clinical_screening", "doadores", False, 6, "Registro de triagem clínica da unidade.", "Configuração demonstrativa / candidato; não representa categorização oficialmente validada para Angola."),
        ("triagem_feminino", "Sexo feminino", "Quantidade agregada demonstrativa de candidatas triadas do sexo feminino.", "clinical_screening", "candidatos", False, 7, "Registro de triagem clínica da unidade.", "Corte demonstrativo; não representa matriz definitiva."),
        ("triagem_masculino", "Sexo masculino", "Quantidade agregada demonstrativa de candidatos triados do sexo masculino.", "clinical_screening", "candidatos", False, 8, "Registro de triagem clínica da unidade.", "Corte demonstrativo; não representa matriz definitiva."),
        ("inaptidao_anemia", "Inaptidão por anemia", "Quantidade agregada demonstrativa de inaptidões atribuídas à anemia.", "clinical_screening", "ocorrências", False, 9, "Registro de triagem clínica da unidade.", "Catálogo candidato; não representa lista validada nacionalmente."),
        ("inaptidao_outros", "Inaptidão por outros motivos", "Quantidade agregada demonstrativa de outras causas de inaptidão.", "clinical_screening", "ocorrências", False, 10, "Registro de triagem clínica da unidade.", "Catálogo candidato; não representa lista validada nacionalmente."),
        ("candidatos_desistentes", "Candidatos desistentes", "Quantidade agregada de candidatos desistentes antes da coleta.", "collection_operations", "candidatos", False, 1, "Registro operacional da coleta.", "Use apenas totais agregados do período."),
        ("dificuldade_puncao_venosa", "Dificuldade de punção venosa", "Quantidade agregada de ocorrências com dificuldade de punção venosa.", "collection_operations", "ocorrências", False, 2, "Registro operacional da coleta.", "Use apenas totais agregados do período."),
        ("reacao_vagal", "Reação vagal", "Quantidade agregada de reações vagais registradas durante a coleta.", "collection_operations", "ocorrências", False, 3, "Registro operacional da coleta.", "Use apenas totais agregados do período."),
        ("interrupcao_outros_motivos", "Outros motivos de interrupção", "Quantidade agregada de interrupções por outros motivos.", "collection_operations", "ocorrências", False, 4, "Registro operacional da coleta.", "Use apenas totais agregados do período."),
        ("coletas_sangue_total", "Coletas de sangue total", "Quantidade agregada de coletas realizadas por sangue total.", "collection_operations", "coletas", False, 5, "Registro operacional da coleta.", "Use apenas totais agregados do período."),
        ("coletas_aferese", "Coletas por aférese", "Quantidade agregada de coletas realizadas por aférese.", "collection_operations", "coletas", False, 6, "Registro operacional da coleta.", "Use apenas totais agregados do período."),
        ("amostras_testadas", "Amostras/bolsas testadas", "Quantidade agregada de amostras ou bolsas testadas na triagem laboratorial no período.", "laboratory_screening", "amostras/bolsas", True, 1, "Registro laboratorial da unidade.", "Use apenas totais agregados do período."),
        ("amostras_reagentes", "Amostras/bolsas reagentes para um ou mais marcadores", "Quantidade agregada de amostras ou bolsas reagentes para um ou mais marcadores na triagem laboratorial do período.", "laboratory_screening", "amostras/bolsas", True, 2, "Registro laboratorial da unidade.", "Use apenas totais agregados do período."),
        ("exame_sifilis_testadas", "Sífilis: amostras testadas", "Quantidade agregada demonstrativa de amostras testadas para sífilis.", "laboratory_screening", "amostras", False, 3, "Registro laboratorial da unidade.", "Configuração demonstrativa / referência funcional."),
        ("exame_sifilis_reagentes", "Sífilis: amostras reagentes", "Quantidade agregada demonstrativa de amostras reagentes para sífilis.", "laboratory_screening", "amostras", False, 4, "Registro laboratorial da unidade.", "Configuração demonstrativa / referência funcional."),
        ("exame_hiv_testadas", "HIV: amostras testadas", "Quantidade agregada demonstrativa de amostras testadas para HIV.", "laboratory_screening", "amostras", False, 5, "Registro laboratorial da unidade.", "Configuração demonstrativa / referência funcional."),
        ("exame_hiv_reagentes", "HIV: amostras reagentes", "Quantidade agregada demonstrativa de amostras reagentes para HIV.", "laboratory_screening", "amostras", False, 6, "Registro laboratorial da unidade.", "Configuração demonstrativa / referência funcional."),
        ("exame_hbv_testadas", "Hepatite B: amostras testadas", "Quantidade agregada demonstrativa de amostras testadas para hepatite B.", "laboratory_screening", "amostras", False, 7, "Registro laboratorial da unidade.", "Configuração demonstrativa / referência funcional."),
        ("exame_hbv_reagentes", "Hepatite B: amostras reagentes", "Quantidade agregada demonstrativa de amostras reagentes para hepatite B.", "laboratory_screening", "amostras", False, 8, "Registro laboratorial da unidade.", "Configuração demonstrativa / referência funcional."),
        ("producao_hemacias_produzidas", "Concentrado de hemácias produzidas", "Quantidade agregada demonstrativa de concentrados de hemácias produzidos.", "hemotherapy_production", "hemocomponentes", False, 1, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("producao_hemacias_recebidas", "Concentrado de hemácias recebidas", "Quantidade agregada demonstrativa de concentrados de hemácias recebidos.", "hemotherapy_production", "hemocomponentes", False, 2, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("producao_hemacias_devolvidas", "Concentrado de hemácias devolvidas", "Quantidade agregada demonstrativa de concentrados de hemácias devolvidos.", "hemotherapy_production", "hemocomponentes", False, 3, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("producao_plaquetas_produzidas", "Concentrado de plaquetas produzidas", "Quantidade agregada demonstrativa de concentrados de plaquetas produzidos.", "hemotherapy_production", "hemocomponentes", False, 4, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("producao_plaquetas_recebidas", "Concentrado de plaquetas recebidas", "Quantidade agregada demonstrativa de concentrados de plaquetas recebidos.", "hemotherapy_production", "hemocomponentes", False, 5, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("producao_plaquetas_devolvidas", "Concentrado de plaquetas devolvidas", "Quantidade agregada demonstrativa de concentrados de plaquetas devolvidos.", "hemotherapy_production", "hemocomponentes", False, 6, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("producao_plasma_produzidas", "Plasma produzido", "Quantidade agregada demonstrativa de plasma produzido.", "hemotherapy_production", "hemocomponentes", False, 7, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("producao_plasma_recebidas", "Plasma recebido", "Quantidade agregada demonstrativa de plasma recebido.", "hemotherapy_production", "hemocomponentes", False, 8, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("producao_plasma_devolvidas", "Plasma devolvido", "Quantidade agregada demonstrativa de plasma devolvido.", "hemotherapy_production", "hemocomponentes", False, 9, "Registro de produção hemoterápica.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("transfusao_hemacias_ambulatorial", "Transfusão ambulatorial de hemácias", "Quantidade agregada demonstrativa de hemácias transfundidas em regime ambulatorial.", "transfusion_distribution", "hemocomponentes", False, 1, "Registro de transfusão ou distribuição da unidade.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("transfusao_hemacias_hospitalar", "Transfusão hospitalar de hemácias", "Quantidade agregada demonstrativa de hemácias transfundidas em ambiente hospitalar.", "transfusion_distribution", "hemocomponentes", False, 2, "Registro de transfusão ou distribuição da unidade.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("transfusao_plaquetas_ambulatorial", "Transfusão ambulatorial de plaquetas", "Quantidade agregada demonstrativa de plaquetas transfundidas em regime ambulatorial.", "transfusion_distribution", "hemocomponentes", False, 3, "Registro de transfusão ou distribuição da unidade.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("transfusao_plaquetas_hospitalar", "Transfusão hospitalar de plaquetas", "Quantidade agregada demonstrativa de plaquetas transfundidas em ambiente hospitalar.", "transfusion_distribution", "hemocomponentes", False, 4, "Registro de transfusão ou distribuição da unidade.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("distribuicao_com_exame_pre_transfusional", "Distribuição com exame pré-transfusional", "Quantidade agregada demonstrativa de hemocomponentes distribuídos com exame pré-transfusional.", "transfusion_distribution", "distribuições", False, 5, "Registro de transfusão ou distribuição da unidade.", "Estrutura candidata; não representa matriz validada para Angola."),
        ("distribuicao_sem_exame_pre_transfusional", "Distribuição sem exame pré-transfusional", "Quantidade agregada demonstrativa de hemocomponentes distribuídos sem exame pré-transfusional.", "transfusion_distribution", "distribuições", False, 6, "Registro de transfusão ou distribuição da unidade.", "Estrutura candidata; não representa matriz validada para Angola."),
    ]
    variables = {}
    for (
        code,
        name,
        operational_definition,
        module_code,
        unit_label,
        required,
        display_order,
        expected_source,
        help_text,
    ) in variable_specs:
        variables[code] = CollectionVariable.objects.create(
            code=code,
            name=name,
            operational_definition=operational_definition,
            module=modules[module_code],
            variable_type=CollectionVariable.TYPE_INTEGER,
            unit=unit_label,
            required=required,
            min_value=0,
            expected_source=expected_source,
            help_text=help_text,
            display_order=display_order,
            active=True,
            version=1,
            is_demo=True,
        )

    IndicatorDefinition.objects.create(
        code="percentual_doacoes_voluntarias",
        name="Percentual de doações voluntárias",
        definition="Percentual de doações voluntárias em relação ao total calculado de doações voluntárias e de reposição do período.",
        module=modules["clinical_screening"],
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
