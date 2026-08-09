import React from "react";
import { Badge } from "@mantine/core";

import { getCollectionStatusLabel, getSyncStatusLabel } from "../../lib/presentation/labels";
import type { CollectionStatus, SyncStatus } from "../../types/submission";


const collectionColors: Record<CollectionStatus, string> = {
  in_progress: "blue",
  ready_for_review: "teal",
  closed: "yellow",
  received: "green",
  accepted: "lime",
  rejected: "red",
};

const syncColors: Record<SyncStatus, string> = {
  local_only: "gray",
  pending: "yellow",
  syncing: "cyan",
  synced: "green",
  error: "red",
  conflict: "orange",
};

export function CollectionStatusBadge({ status }: { status: CollectionStatus }) {
  return <Badge color={collectionColors[status]}>{getCollectionStatusLabel(status)}</Badge>;
}

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  return <Badge color={syncColors[status]}>{getSyncStatusLabel(status)}</Badge>;
}
