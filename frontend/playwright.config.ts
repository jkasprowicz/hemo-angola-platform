import { defineConfig } from "@playwright/test";

import crypto from "node:crypto";

if (!process.env.E2E_DEMO_PASSWORD) {
  process.env.E2E_DEMO_PASSWORD = crypto.randomBytes(18).toString("base64url");
}

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
  },
  webServer: [
    {
      command:
        "sh -c 'cd ../backend && rm -f test.sqlite3 && . .venv/bin/activate && export DJANGO_DEMO_PASSWORD=$E2E_DEMO_PASSWORD && DJANGO_USE_SQLITE_FOR_TESTS=True python manage.py migrate && DJANGO_USE_SQLITE_FOR_TESTS=True python manage.py seed_demo_data --reset && DJANGO_USE_SQLITE_FOR_TESTS=True DJANGO_DEBUG=True DJANGO_CSRF_TRUSTED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 DJANGO_CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 python manage.py runserver 127.0.0.1:8000'",
      port: 8000,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "sh -c 'npm run build && npm run preview -- --host 127.0.0.1 --port 5173 --strictPort'",
      port: 5173,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
