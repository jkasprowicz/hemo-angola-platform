# ADR-007: Configurable Indicators

## Decision

Model indicators as backend metadata rather than hardcoding all business semantics directly in the UI.

## Why

- indicator governance evolves over time
- formulas and variables need versionable metadata
- dashboard and collection logic benefit from shared central definitions

## Repository evidence

- `CollectionModule`, `CollectionVariable`, `IndicatorDefinition`
- demo seed catalog
- bootstrap catalog payload
