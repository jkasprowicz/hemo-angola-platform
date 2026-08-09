import type { CollectionStatus, DisplayRole, SyncStatus, UserRole } from "../../types/submission";


export function getDisplayRole(role: UserRole): DisplayRole {
  const labels: Record<UserRole, DisplayRole> = {
    operator: "Operador",
    reviewer: "Revisor",
    manager: "Gestor",
    admin: "Administrador",
    researcher: "Pesquisador",
  };

  return labels[role];
}

export function getCollectionStatusLabel(status: CollectionStatus) {
  const labels: Record<CollectionStatus, string> = {
    in_progress: "Em preenchimento",
    ready_for_review: "Pronta para revisão",
    closed: "Pronta para envio",
    received: "Recebida",
    accepted: "Aceita",
    rejected: "Devolvida",
  };

  return labels[status];
}

export function getSyncStatusLabel(status: SyncStatus) {
  const labels: Record<SyncStatus, string> = {
    local_only: "Somente neste dispositivo",
    pending: "Aguardando envio",
    syncing: "Enviando...",
    synced: "Sincronizada",
    error: "Erro no envio",
    conflict: "Conflito",
  };

  return labels[status];
}
