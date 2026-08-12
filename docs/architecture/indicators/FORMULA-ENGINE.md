# Formula Engine

Status: conceptual, not implemented as a generic engine

## Objective

Define a safe future architecture for evaluating configurable indicator formulas without arbitrary `eval`.

## Current state

- The frontend calculates some derived values directly from catalog rules.
- The dashboard uses explicit Python code for three indicators.
- There is no generalized parser/executor for arbitrary indicator formulas.

## Future engine requirements

### Allowed operators

- `+`
- `-`
- `*`
- `/`
- parentheses
- comparison operators only if later required for guarded expressions

### Allowed functions

- `sum()`
- `min()`
- `max()`
- `round()`
- `coalesce()`
- `percentage()` as a domain helper

### Variables

- Must reference registered `CollectionVariable.code` identifiers only.
- Unknown identifiers must fail validation.

### Validation

The engine should validate:

- syntax
- variable existence
- unit compatibility where applicable
- forbidden function or operator use
- circular dependencies if derived indicators ever depend on other derived indicators

### Division by zero

Required behavior:

- never crash execution
- return `null` or explicitly configured fallback
- preserve diagnostic metadata for audit and UI explanation

### Missing values

Required behavior:

- distinguish truly missing from numeric zero
- allow explicit null propagation rules
- avoid inventing values silently

### Versioning

- Formula execution must be tied to an immutable indicator version.
- Historical reports must remain reproducible using the same version that was active at calculation time.

### Testing

The future engine should carry:

- parser tests
- validation tests
- zero-division tests
- null-handling tests
- version-compatibility tests
- malicious-expression rejection tests

## Recommended implementation direction

- Parse to an AST using a restricted grammar.
- Evaluate only whitelisted nodes.
- Store normalized formula expressions and dependency graphs.
- Keep engine execution deterministic and side-effect free.
