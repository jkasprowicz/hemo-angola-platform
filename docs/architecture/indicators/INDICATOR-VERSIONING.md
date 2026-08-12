# Indicator Versioning

## Principle

Indicator evolution must preserve analytical history. A change that alters meaning should produce a new version rather than mutate the previous one in place.

## Changes that should trigger a new version

- formula change
- numerator change
- denominator change
- unit change
- periodicity change

Usually also:

- interpretation change with analytical impact
- domain remapping that changes reporting semantics

## Current repository baseline

Implemented metadata already includes:

- `version`
- `valid_from`
- `valid_to`

This is enough to establish a versioning contract, but not yet enough for full historical governance.

## Historical preservation rule

Past records and reports must preserve the version used at the time of collection or calculation.

Recommended persistence strategy:

1. Persist the collection payload exactly as submitted.
2. Persist or infer the catalog version summary tied to that submission.
3. Recalculate historical indicators only against the version applicable to that submission.

## Recommended future controls

- immutable published versions
- explicit supersedes relationship
- version activation date
- version retirement date
- migration note explaining analytical impact
- approval metadata

## Risks if versioning is ignored

- broken comparability over time
- invisible KPI definition drift
- dashboard values that cannot be reproduced
- governance disputes during pilot review
