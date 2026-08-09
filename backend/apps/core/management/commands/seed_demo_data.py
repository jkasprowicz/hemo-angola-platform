from django.core.management.base import BaseCommand

from apps.core.services import ensure_demo_data, reset_demo_data


class Command(BaseCommand):
    help = "Creates the demo institution, unit, reporting period, and users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove only demo data before recreating the demo baseline.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            reset_demo_data()
        ensure_demo_data()
        self.stdout.write(self.style.SUCCESS("Demo data created or updated."))
