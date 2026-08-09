from rest_framework import serializers

from apps.submissions.models import ReportingPeriod


class DashboardFilterSerializer(serializers.Serializer):
    unit_id = serializers.IntegerField(required=False)
    period_from = serializers.IntegerField(required=False)
    period_to = serializers.IntegerField(required=False)

    def validate(self, attrs):
        period_from = attrs.get("period_from")
        period_to = attrs.get("period_to")

        if period_from and not ReportingPeriod.objects.filter(pk=period_from).exists():
            raise serializers.ValidationError({"period_from": "Período inicial inválido."})
        if period_to and not ReportingPeriod.objects.filter(pk=period_to).exists():
            raise serializers.ValidationError({"period_to": "Período final inválido."})
        if period_from and period_to:
            period_from_obj = ReportingPeriod.objects.only("reference_year", "reference_month").get(pk=period_from)
            period_to_obj = ReportingPeriod.objects.only("reference_year", "reference_month").get(pk=period_to)
            if (period_from_obj.reference_year, period_from_obj.reference_month) > (
                period_to_obj.reference_year,
                period_to_obj.reference_month,
            ):
                raise serializers.ValidationError({"period_to": "O período final deve ser igual ou posterior ao inicial."})

        return attrs
