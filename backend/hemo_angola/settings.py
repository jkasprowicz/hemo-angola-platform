import os
from pathlib import Path
from typing import Iterable, List
from datetime import date


BASE_DIR = Path(__file__).resolve().parent.parent


def _shift_months(reference: date, delta_months: int) -> date:
    month_index = (reference.year * 12 + (reference.month - 1)) + delta_months
    year, month_offset = divmod(month_index, 12)
    return date(year, month_offset + 1, 1)


def _split_origins(value: str) -> List[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _dedupe_origins(origins: Iterable[str]) -> List[str]:
    unique: List[str] = []
    for origin in origins:
        if origin and origin not in unique:
            unique.append(origin)
    return unique


def build_default_frontend_origins() -> List[str]:
    origins: List[str] = []
    frontend_url = os.getenv("FRONTEND_URL", "").strip()
    if frontend_url:
        origins.append(frontend_url)

    if os.getenv("DJANGO_DEBUG", "False").lower() == "true":
        origins.extend(
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        )

    return _dedupe_origins(origins)


def build_csrf_trusted_origins() -> List[str]:
    configured_origins = os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").strip()
    if configured_origins:
        return _split_origins(configured_origins)

    return build_default_frontend_origins()


def build_cors_allowed_origins() -> List[str]:
    configured_origins = os.getenv("DJANGO_CORS_ALLOWED_ORIGINS", "").strip()
    if configured_origins:
        return _split_origins(configured_origins)

    return build_csrf_trusted_origins()

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if host.strip()]
CSRF_TRUSTED_ORIGINS = build_csrf_trusted_origins()
REPORTING_PERIOD_PAST_MONTHS = int(os.getenv("REPORTING_PERIOD_PAST_MONTHS", "24"))
REPORTING_PERIOD_FUTURE_MONTHS = int(os.getenv("REPORTING_PERIOD_FUTURE_MONTHS", "3"))
_current_month_reference = date.today().replace(day=1)
REPORTING_PERIOD_MIN = _shift_months(_current_month_reference, -REPORTING_PERIOD_PAST_MONTHS)
REPORTING_PERIOD_MAX = _shift_months(_current_month_reference, REPORTING_PERIOD_FUTURE_MONTHS)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "apps.core",
    "apps.submissions",
    "apps.validation",
    "apps.accepted_data",
    "apps.consolidation",
    "apps.dashboard",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "hemo_angola.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "hemo_angola.wsgi.application"

if os.getenv("DJANGO_USE_SQLITE_FOR_TESTS", "False").lower() == "true":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "test.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "hemo_angola"),
            "USER": os.getenv("POSTGRES_USER", "hemo_angola"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "hemo_angola_dev"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}


CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",  # Recommended in case your browser falls back to the IP
]

CORS_ALLOWED_ORIGINS = build_cors_allowed_origins()
CORS_ALLOW_CREDENTIALS = True

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = os.getenv("DJANGO_SESSION_COOKIE_SECURE", "False").lower() == "true"
CSRF_COOKIE_SECURE = os.getenv("DJANGO_CSRF_COOKIE_SECURE", "False").lower() == "true"
