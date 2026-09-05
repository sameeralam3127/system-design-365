# Architecture Decision Records

An ADR records a decision that was genuinely contested: the options that were
considered, the one that was chosen, and what it cost. Decisions with an obvious
answer do not get an ADR — the point is to preserve the reasoning that is
otherwise lost when the people who made the call move on.

Format used here:

```text
Context · Options · Decision · Rationale · Trade-offs · Consequences · Status
```

## Planned

| ADR | Decision |
|---|---|
| ADR-001 | Argo CD GitOps over pipeline-driven `kubectl` deployment |
| ADR-002 | Prometheus + Loki over a managed all-in-one observability vendor |
| ADR-003 | OpenTofu over Terraform for new infrastructure |
| ADR-004 | Expand/contract migrations as a hard requirement for rollback safety |
| ADR-005 | Requests equal to limits for latency-critical workloads |
