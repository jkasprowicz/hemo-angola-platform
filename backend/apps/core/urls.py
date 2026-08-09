from django.urls import include, path

from .views import BootstrapView, CsrfTokenView, HealthView, LoginView, LogoutView, SessionView


urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("auth/csrf/", CsrfTokenView.as_view(), name="csrf-token"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/session/", SessionView.as_view(), name="session"),
    path("bootstrap/", BootstrapView.as_view(), name="bootstrap"),
    path("", include("apps.dashboard.urls")),
    path("", include("apps.submissions.urls")),
]
