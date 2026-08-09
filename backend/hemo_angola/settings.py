import os
from pathlib import Path
from typing import Iterable, List, Optional
from datetime import date

from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent


def env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise ImproperlyConfigured(f"Missing required environment variable: {name}")
    return value


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).lower() == "true"


def env_int(name: str, default: int) -> int:
    return int(os.getenv(name, str(default)))


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

    if env_bool("DJANGO_DEBUG", False):
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

DJANGO_ENV = env("DJANGO_ENV", "development").strip().lower()
DEBUG = env_bool("DJANGO_DEBUG", DJANGO_ENV == "development")
SECRET_KEY = env("DJANGO_SECRET_KEY", "__MISSING_SECRET_KEY__")
if not DEBUG and SECRET_KEY == "__MISSING_SECRET_KEY__":
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in production.")

default_allowed_hosts = "localhost,127.0.0.1,testserver" if DEBUG else ""
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", default_allowed_hosts).split(",")
    if host.strip()
]
if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must be configured in production.")

CSRF_TRUSTED_ORIGINS = build_csrf_trusted_origins()
REPORTING_PERIOD_PAST_MONTHS = env_int("REPORTING_PERIOD_PAST_MONTHS", 24)
REPORTING_PERIOD_FUTURE_MONTHS = env_int("REPORTING_PERIOD_FUTURE_MONTHS", 3)
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
            "NAME": env("POSTGRES_DB", "hemo_angola"),
            "USER": env("POSTGRES_USER", "hemo_angola"),
            "PASSWORD": env("POSTGRES_PASSWORD", ""),
            "HOST": env("POSTGRES_HOST", "localhost"),
            "PORT": env("POSTGRES_PORT", "5432"),
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

STATIC_URL = "/static/"
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
CORS_ALLOWED_ORIGINS = build_cors_allowed_origins()
CORS_ALLOW_CREDENTIALS = True

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", not DEBUG)
SECURE_PROXY_SSL_HEADER = (
    ("HTTP_X_FORWARDED_PROTO", "https")
    if env_bool("DJANGO_SECURE_PROXY_SSL_HEADER", False)
    else None
)
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", False)
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
USE_X_FORWARDED_HOST = env_bool("DJANGO_USE_X_FORWARDED_HOST", False)

LOG_LEVEL = env("DJANGO_LOG_LEVEL", "INFO").upper()
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "gunicorn.error": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "gunicorn.access": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
    },
}
