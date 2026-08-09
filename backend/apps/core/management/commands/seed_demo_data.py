import os

from django.core.management.base import BaseCommand, CommandError

from apps.core.services import ensure_demo_data, reset_demo_data


class Command(BaseCommand):
    help = "Creates the demo institution, unit, reporting period, and users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove only demo data before recreating the demo baseline.",
        )
        parser.add_argument(
            "--demo-password",
            dest="demo_password",
            help="Password applied to all demo users for this run.",
        )

    def handle(self, *args, **options):
        demo_password = (options.get("demo_password") or os.getenv("DJANGO_DEMO_PASSWORD", "")).strip()
        if not demo_password:
            raise CommandError(
                "Provide --demo-password or DJANGO_DEMO_PASSWORD to create demo credentials."
            )
        os.environ["DJANGO_DEMO_PASSWORD"] = demo_password
        if options["reset"]:
            reset_demo_data()
        ensure_demo_data()
        self.stdout.write(self.style.SUCCESS("Demo data created or updated."))
