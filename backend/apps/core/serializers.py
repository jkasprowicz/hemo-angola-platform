from rest_framework import serializers

from apps.core.models import Institution, Unit, UserProfile
from apps.submissions.models import CollectionModule, CollectionVariable, IndicatorDefinition, ReportingPeriod


class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ("id", "name")


class UnitSerializer(serializers.ModelSerializer):
    institution = InstitutionSerializer(read_only=True)

    class Meta:
        model = Unit
        fields = ("id", "name", "code", "institution")


class ReportingPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportingPeriod
        fields = ("id", "label", "reference_year", "reference_month", "start_date", "end_date", "status")


class CollectionModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionModule
        fields = (
            "id",
            "code",
            "name",
            "description",
            "display_order",
            "active",
            "version",
            "valid_from",
            "valid_to",
            "is_demo",
        )


class CollectionVariableSerializer(serializers.ModelSerializer):
    module_code = serializers.CharField(source="module.code", read_only=True)

    class Meta:
        model = CollectionVariable
        fields = (
            "id",
            "code",
            "name",
            "operational_definition",
            "module",
            "module_code",
            "variable_type",
            "unit",
            "required",
            "min_value",
            "max_value",
            "expected_source",
            "help_text",
            "display_order",
            "active",
            "version",
            "select_options",
            "is_demo",
        )


class IndicatorDefinitionSerializer(serializers.ModelSerializer):
    module_code = serializers.CharField(source="module.code", read_only=True)
    numerator_variable_code = serializers.CharField(source="numerator_variable.code", read_only=True)
    denominator_variable_code = serializers.CharField(source="denominator_variable.code", read_only=True)

    class Meta:
        model = IndicatorDefinition
        fields = (
            "id",
            "code",
            "name",
            "definition",
            "module",
            "module_code",
            "dimension",
            "unit",
            "formula_kind",
            "formula_label",
            "numerator_variable",
            "numerator_variable_code",
            "denominator_variable",
            "denominator_variable_code",
            "version",
            "valid_from",
            "valid_to",
            "interpretation",
            "is_demo",
        )


class UserProfileSerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ("role", "unit")


class SessionUserSerializer(serializers.Serializer):
    username = serializers.CharField()
    full_name = serializers.CharField()
    role = serializers.CharField()
