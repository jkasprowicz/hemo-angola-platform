from django.conf import settings
from django.db import models


class Institution(models.Model):
    name = models.CharField(max_length=255)
    is_demo = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.name


class Unit(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="units")
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=64, unique=True)
    is_demo = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.name


class UserProfile(models.Model):
    ROLE_OPERATOR = "operator"
    ROLE_REVIEWER = "reviewer"
    ROLE_MANAGER = "manager"
    ROLE_ADMIN = "admin"
    ROLE_RESEARCHER = "researcher"

    ROLE_CHOICES = [
        (ROLE_OPERATOR, "Operador"),
        (ROLE_REVIEWER, "Revisor"),
        (ROLE_MANAGER, "Gestor"),
        (ROLE_ADMIN, "Administrador funcional"),
        (ROLE_RESEARCHER, "Pesquisador"),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="profiles")
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, related_name="profiles", null=True, blank=True)
    role = models.CharField(max_length=32, choices=ROLE_CHOICES)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"

