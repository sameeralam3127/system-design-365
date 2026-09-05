# Kubernetes

Scheduling, probes, autoscaling, cluster architecture and the failure modes that
follow from them. Each case study starts from a running production system and a
clock, not from a definition.

## Written

| Case study | Type | Difficulty |
|---|---|---|
| [CrashLoopBackOff After a Release](crashloopbackoff-after-release.md) | Troubleshooting | Medium |
| [OOMKilled Under Load](oomkilled-under-load.md) | Troubleshooting | Hard |

## Planned

| Case study | Type |
|---|---|
| Pods stuck in Pending — requests, taints, topology spread | Troubleshooting |
| NodeNotReady and the kubelet's view of a failing node | Troubleshooting |
| Cluster DNS latency and the `ndots:5` search-path tax | Troubleshooting |
| HPA not scaling: missing metrics, wrong signal, cooldowns | Troubleshooting |
| Designing a production Kubernetes platform | Architecture |
| Zero-downtime cluster upgrade | Migration |

## Related projects

- [KubeRescue](https://github.com/sameeralam3127/KubeRescue) — Go engine for
  autonomous Kubernetes failure detection and policy-driven auto-remediation.
- [Kubernetes Platform](https://github.com/sameeralam3127/kubernetes-platform) —
  a production-grade platform covering GitOps, IaC, CI/CD, observability,
  security and autoscaling.
