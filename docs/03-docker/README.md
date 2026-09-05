# Docker

Images, build pipelines, and the runtime behaviour that containers inherit from
cgroups and namespaces. Most "it works on my machine" bugs in this section are
really differences in what the container can see of the host.

## Written

*None yet.*

## Planned

| Case study | Type |
|---|---|
| Image size optimisation with multi-stage builds | Optimisation |
| Container resource limits: what the runtime sees vs what the host has | Troubleshooting |
| Container networking: bridge, host, and the DNS inside the daemon | Troubleshooting |
| Build cache design for fast, reproducible CI | Optimisation |
| Container hardening: non-root, read-only rootfs, dropped capabilities | Security |
