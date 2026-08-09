from django.urls import path

from .views import AuditEventListView, ServerRecordsView, SyncBatchView


urlpatterns = [
    path("sync/", SyncBatchView.as_view(), name="sync-batch"),
    path("records/server/", ServerRecordsView.as_view(), name="server-records"),
    path("audit-events/", AuditEventListView.as_view(), name="audit-events"),
]
