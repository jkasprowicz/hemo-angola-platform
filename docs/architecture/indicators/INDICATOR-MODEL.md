# Indicator Model

## Purpose

This document formalizes the indicator model implied by the current repository and clarifies where the present implementation is demonstrative versus future-state.

## Core conceptual entities

### IndicatorDefinition

Implemented server-side metadata entity used to describe:

- code
- name
- definition
- module
- dimension
- unit
- formula kind
- formula label
- numerator variable
- denominator variable
- version
- validity window
- interpretation

### CalculatedIndicator

Not persisted today as its own backend model. It exists as a derived runtime concept in the frontend validation summary and in dashboard aggregation payloads.

Rule:

- A calculated indicator is derived from base data and must never be typed manually.

### CollectionVariable

Implemented server-side variable metadata describing the base fields collected by operators, including:

- variable type
- required flag
- min/max constraints
- expected source
- help text
- display order
- versioning metadata

### CollectionResponse

Not stored as a dedicated normalized relational table in the current backend. In practice it exists:

- locally inside `LocalSubmissionRecord.responses`
- centrally inside `SubmissionVersion.payload.responses`

### ModuleDefinition

Mapped to implemented `CollectionModule`, used to group variables and indicators by operational domain.

### FieldDefinition

Represented today by `CollectionVariable` plus frontend presentation metadata generated in the catalog layer.

## Data flow principle

`base data -> validation -> formula -> calculated indicator`

Applied to the current codebase:

1. Operators enter aggregated response values.
2. Validation checks completeness and basic consistency.
3. Local derived indicators are calculated from catalog metadata.
4. Dashboard recalculates aggregate indicator values from received base data.

## As-is repository interpretation

- Indicator metadata is centrally defined in Django models and demo seed data.
- The frontend consumes this metadata during bootstrap.
- The frontend computes derived values for the active record.
- The dashboard recomputes selected indicators from received versions.
- There is no generic persisted `CalculatedIndicator` history table yet.

## Current limitations

- Only a small demonstrative indicator set is active in the dashboard.
- Formula kinds in the backend model are limited and not executed by a generic safe engine.
- Historical indicator version used for each past record is implied by payload/catalog metadata, not yet formalized as a dedicated immutable indicator-result snapshot.

## Design implications

1. Base variables remain the system of record.
2. Indicator values should always be reproducible from stored base responses plus the applicable catalog version.
3. Future administrative indicator editing must preserve version lineage rather than mutate existing rules in place.
