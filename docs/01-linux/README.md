# Linux

Host-level failures — the layer everything else is standing on. Container and
Kubernetes problems frequently turn out to be Linux problems wearing a different
hat: a cgroup limit, a full inode table, a process that ignores SIGTERM.

## Written

*None yet.*

## Planned

| Case study | Type |
|---|---|
| High CPU on a production server | Troubleshooting |
| Memory leak on a long-running host | Troubleshooting |
| Disk exhaustion — inodes, journald, and deleted-but-open files | Troubleshooting |
| Zombie and orphaned processes | Troubleshooting |
| systemd unit failure and restart loops | Troubleshooting |
| Fleet health checks across mixed distributions | Architecture |

## Related projects

- [LinuxVitals](https://github.com/sameeralam3127/linux-vitals) — agentless
  Ansible collection for Linux fleet health checks across RHEL, Fedora, Ubuntu
  and SUSE, with baseline/postcheck comparison and opt-in self-healing.
