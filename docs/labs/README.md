# Labs

Reproducible environments that break on purpose. A case study explains a
failure; a lab lets you cause it, watch the signals move, and practise the
investigation before you have to do it at 03:00.

Each lab is intended to contain:

```text
README.md          the scenario, and what "solved" looks like
setup/             scripts or manifests that build the environment
scripts/           the fault injection
expected-output/   what the signals should look like when it breaks
solution/          the walkthrough, kept separate so you can try first
```

## Planned

| Lab | Pairs with |
|---|---|
| `kubernetes-crashloop` | CrashLoopBackOff After a Release |
| `container-memory-limits` | OOMKilled Under Load |
| `prometheus-alerting` | From alert fatigue to SLO-based alerting |
| `terraform-drift` | Drift detection |
| `nginx-troubleshooting` | Intermittent 502s |
