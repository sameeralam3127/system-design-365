---
title: {{title}}
description: One line describing the failure or design problem, not the technology.
tags: [kubernetes, incident]
type: troubleshooting        # architecture | troubleshooting | migration | optimization | security | incident
difficulty: medium           # easy | medium | hard
author: Sameer Alam
created: {{date}}
updated: {{date}}
status: draft
---

## Scenario

One paragraph. A specific system, a specific failure, a specific clock running.
Name the numbers: error rate, replica count, request volume, time budget.

## Context

The environment: cluster size, cloud, versions, traffic profile, team shape.
State versions explicitly wherever behaviour is version-dependent.

## Symptoms

What the on-call engineer actually sees — alerts, dashboards, user reports.

## Impact

Technical impact and business impact, separately.

## Requirements

What the solution must achieve. Numbered, testable.

## Constraints

Downtime budget, cost, security, compatibility, scale, team size, existing
infrastructure. Constraints are what make the trade-off section non-trivial.

## Initial Architecture

```text
ASCII diagram of the system before remediation.
```

## Investigation

The path a competent engineer walks, in order. Each command must be followed by
what its output tells you and what it rules out.

```bash
kubectl get pods -n <ns>
```

## Root Cause

The candidate causes, and the specific evidence that distinguishes them.

## Solution

## Architecture

```text
ASCII diagram after remediation.
```

## Implementation

Real manifests, Terraform, Bash, Python or Go. Runnable, not pseudocode.

## Observability

Metrics, logs, traces, dashboards, alerts. PromQL where relevant.

## Security

## Reliability

Failure domains, redundancy, probes, retries, timeouts, rollback, DR.

## Cost Considerations

Cost drivers and optimisation levers. No invented prices.

## Trade-offs

Why this solution over the alternatives, and what it costs you.

## Failure Scenarios

What can still break after the fix.

## Runbook

Numbered, executable, written for 03:00.

## Prevention

## Postmortem

Timeline, root cause, contributing factors, detection, mitigation, resolution,
corrective actions with owners.

## Interview Questions

5–10 scenario questions this case study prepares you for.

## Key Takeaways

## Related Projects
