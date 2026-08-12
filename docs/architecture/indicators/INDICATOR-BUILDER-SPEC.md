# Indicator Builder Specification

Status: conceptual, not implemented

## Goal

Define the future administrative capability for managing hemotherapy indicators without hardcoding business rules into frontend screens.

## Scope

The builder should eventually allow authorized users to configure:

- name
- code
- domain
- description
- unit
- variables
- numerator
- denominator
- formula
- periodicity
- decimal places
- status
- validity window
- source
- limitations

## Proposed lifecycle

- `DRAFT`
- `UNDER_REVIEW`
- `APPROVED`
- `ACTIVE`
- `RETIRED`

## Core design rules

1. Indicator definitions are metadata, not code patches.
2. Activation of a new definition must not mutate historical results.
3. Changes with analytical impact should create a new indicator version.
4. Builder users must be distinct from ordinary collection operators.

## Minimum object model

- `IndicatorDefinition`
- `IndicatorVersion`
- `IndicatorVariableBinding`
- `IndicatorApprovalRecord`

## Administrative workflow

1. Create draft definition.
2. Bind allowed base variables.
3. Validate formula grammar and dependencies.
4. Record reviewer comments.
5. Approve and activate for a defined validity start date.
6. Retire only by version transition, not destructive overwrite.

## Constraints from the current repository

- Present code already stores metadata for indicator code, formula kind and numerator/denominator bindings.
- There is no UI or workflow for authoring these objects today.
- Final governance depends on INS and scientific coordination.
