# Connectivity Resilience

## As-is architecture

Current implementation follows:

`PWA -> IndexedDB -> SyncQueue -> SyncEngine -> Central API`

Implemented resilience components:

- PWA frontend usable after authentication and bootstrap
- IndexedDB local persistence for records, queue, metadata and local audit
- explicit sync queue decoupled from data entry
- retry/backoff after failed sync
- interrupted sync recovery at app startup

## What is implemented today

### Offline by device

Supported.

Operators can:

- start a collection
- fill responses
- save locally
- reload and continue
- close the collection
- wait for connectivity to synchronize later

### Multi-user offline operation

Not supported as a coordinated distributed mode.

Current limitations:

- no local LAN synchronization between devices
- no shared edge datastore
- no cross-device conflict arbitration

## Proposed additional requirement

- `NFR-CONN-002`: prolonged operation without external connectivity

Current status:

- `PROPOSED`

Reason:

- the repository already handles device-local interruption well, but long-duration pilot operation across several users may require a local edge pattern or another coordination mechanism.

## Architectural conclusion

The current product is connectivity-resilient at the device level, not yet at the site-wide disconnected-operation level.
