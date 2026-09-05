# Networking

DNS, TCP, proxies, load balancers and TLS. The failures in this section share a
property that makes them hard: the symptom appears at a layer far above the
cause, and the metrics of the failing component usually look fine.

## Written

*None yet.*

## Planned

| Case study | Type |
|---|---|
| DNS resolution failure in a service mesh | Troubleshooting |
| Intermittent 502s from an upstream keepalive mismatch | Troubleshooting |
| TCP connection timeouts under load — backlog, TIME_WAIT, ephemeral ports | Troubleshooting |
| Load balancer health check flapping | Troubleshooting |
| TLS certificate expiry in production | Incident |
| nginx as a reverse proxy: timeouts, buffering, and upstream failover | Architecture |

## Related projects

- [IPMG](https://github.com/sameeralam3127/ipmg) — modular IP management and
  ping-monitoring CLI with parallel network scanning, subnet auto-discovery and
  scheduled monitoring.
