# Local Edge Option

Status: proposed, depends on pilot diagnosis

## Compared models

### Model A

Device-local persistence plus cloud synchronization.

Current repository alignment:

- this is the implemented architecture today

### Model B

Local edge server plus eventual cloud synchronization.

Current repository alignment:

- not implemented

## Comparison

| Topic | Model A: device-local + cloud | Model B: local edge + cloud |
| --- | --- | --- |
| Complexity | lower | higher |
| Current code fit | direct | requires new components |
| Single-device resilience | strong | strong |
| Site-wide disconnected teamwork | limited | stronger |
| Security surface | simpler browser-only local state | adds server/node hardening locally |
| Backup | mostly central plus device risk | requires edge backup plus central sync |
| Operational burden | lower | significantly higher |
| Conflict management | mostly deferred to cloud sync | may shift to edge reconciliation first |

## When Model B becomes attractive

- prolonged external internet outages
- multiple operators working concurrently in the same unit
- need for local shared visibility before central connectivity returns

## Recommendation

Keep Model A as the current baseline. Reassess Model B only after pilot diagnosis confirms that device-local plus later cloud sync is insufficient.
