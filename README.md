# DevOps Engineering Case Studies

**Learn the problem. Design the solution. Understand the trade-offs. Operate the system.**

Practical DevOps, SRE, Cloud and Platform Engineering case studies covering
architecture, troubleshooting, automation, reliability, security and production
operations.

Live site: **https://sameeralam3127.github.io/devops-case-studies/**

---

## Contents

- [What this is](#what-this-is)
- [Who it is for](#who-it-is-for)
- [How a case study is structured](#how-a-case-study-is-structured)
- [Categories](#categories)
- [Written so far](#written-so-far)
- [Roadmap](#roadmap)
- [Related projects](#related-projects)
- [System design](#system-design)
- [The site generator (sd365)](#the-site-generator-sd365)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## What this is

Most DevOps learning material is either a definition ("Kubernetes is a container
orchestrator") or a command list. Neither is what the job is. The job is being
handed a system that is already broken, already in production, and already
costing money, and working out what is true before the clock runs out.

So every entry here starts from a system in a specific state:

> Your production API deployment has entered `CrashLoopBackOff` after a release.
> Three replicas are restarting continuously, the surviving pods are carrying
> 2.2× their normal load, and the error rate has reached 12%. You have 15
> minutes before this goes on the status page.

and then works through it the way you would actually work through it —
investigation, the evidence that separates one root cause from another, the
mitigation, the trade-offs of the fix, the observability that should have caught
it earlier, the runbook, and the postmortem.

Where a case study makes a claim about how a system behaves, it names the
version. Where it discusses cost, it discusses cost *drivers* rather than
invented prices. Scenarios are constructed for teaching; the mechanisms are real.

## Who it is for

- **Engineers preparing for DevOps/SRE/Platform interviews** who are past the
  definitions stage and need scenario practice.
- **Engineers new to on-call** who want to have seen a failure mode once before
  meeting it at 03:00.
- **Anyone building the operational side of a platform** — the prevention and
  observability sections are written as things to go and implement.

## How a case study is structured

Every case study follows the same template
([`templates/case-study.md`](templates/case-study.md)):

```text
Scenario → Context → Symptoms → Impact → Requirements → Constraints
   → Initial Architecture → Investigation → Root Cause → Solution
   → Architecture → Implementation → Observability → Security → Reliability
   → Cost → Trade-offs → Failure Scenarios → Runbook → Prevention
   → Postmortem → Interview Questions → Key Takeaways → Related Projects
```

The consistency is deliberate. It is the same order a competent engineer works
in, and repeating it is how the order becomes a habit.

## Categories

Not everything is an incident. Case studies are tagged by type:

| Type | What it covers |
|---|---|
| **Architecture** | Designing a platform, an observability stack, a CI/CD system |
| **Troubleshooting** | A specific production failure, investigated from the alert |
| **Migration** | VM to containers, Jenkins to Actions, single- to multi-region |
| **Optimisation** | Cost, image size, pipeline duration, MTTR, logging volume |
| **Security** | Compromised credentials, excessive RBAC, supply-chain risk |
| **Incident** | A full outage with timeline and blameless postmortem |

## Written so far

| Case study | Domain | Type | Difficulty |
|---|---|---|---|
| [CrashLoopBackOff After a Release](docs/04-kubernetes/crashloopbackoff-after-release.md) | Kubernetes | Troubleshooting | Medium |
| [OOMKilled Under Load](docs/04-kubernetes/oomkilled-under-load.md) | Kubernetes | Troubleshooting | Hard |
| [Python Execution Surfaces Before Your Code Runs](docs/10-security/python-before-your-code-runs.md) | Security | Reference | Medium |

Plus five distributed-systems designs under [System design](#system-design).

This is an honest count. The repository is being rebuilt from a previous
incarnation ("System Design 365") and I would rather show three finished case
studies than a hundred stubs — the stubs are exactly what was removed.

## Roadmap

Each domain has an index page listing what is written and what is planned:

| Domain | Index |
|---|---|
| Linux | [`docs/01-linux/`](docs/01-linux/README.md) |
| Networking | [`docs/02-networking/`](docs/02-networking/README.md) |
| Docker | [`docs/03-docker/`](docs/03-docker/README.md) |
| Kubernetes | [`docs/04-kubernetes/`](docs/04-kubernetes/README.md) |
| CI/CD | [`docs/05-cicd/`](docs/05-cicd/README.md) |
| GitOps | [`docs/06-gitops/`](docs/06-gitops/README.md) |
| Infrastructure as Code | [`docs/07-infrastructure-as-code/`](docs/07-infrastructure-as-code/README.md) |
| Observability | [`docs/08-observability/`](docs/08-observability/README.md) |
| SRE | [`docs/09-sre/`](docs/09-sre/README.md) |
| Security | [`docs/10-security/`](docs/10-security/README.md) |
| Cloud | [`docs/11-cloud/`](docs/11-cloud/README.md) |
| Platform Engineering | [`docs/12-platform-engineering/`](docs/12-platform-engineering/README.md) |

Supporting sections: [Labs](docs/labs/README.md) ·
[Decision Records](docs/adr/README.md) ·
[Interview Prep](docs/interview/README.md) ·
[Glossary](docs/glossary/README.md) · [Notes](docs/notes/README.md)

## Related projects

These case studies are written alongside implementations, not instead of them.
Where a case study describes a pattern one of these projects implements, it says
so and links to it.

| Project | What it is |
|---|---|
| [KubeRescue](https://github.com/sameeralam3127/KubeRescue) | Autonomous Kubernetes failure detection and policy-driven auto-remediation (Go) |
| [ANSARI](https://github.com/sameeralam3127/ansari) | Internal developer platform that scaffolds services and keeps the fleet on the paved road (Python) |
| [Kubernetes Platform](https://github.com/sameeralam3127/kubernetes-platform) | Production-grade platform: GitOps, IaC, CI/CD, observability, security, autoscaling |
| [LinuxVitals](https://github.com/sameeralam3127/linux-vitals) | Agentless Ansible collection for Linux fleet health checks with opt-in self-healing |
| [IPMG](https://github.com/sameeralam3127/ipmg) | IP management and ping-monitoring CLI: parallel scanning, subnet discovery, scheduled monitoring |
| [Monitoring](https://github.com/sameeralam3127/Monitoring) | Docker-based Prometheus, Grafana, Node Exporter and cAdvisor stack |
| [SRE Toolkit](https://github.com/sameeralam3127/sre-toolkit) | Browser-based SRE utilities — encoders, CIDR calculator, DevOps converters |

## System design

The [`docs/system-design/`](docs/system-design/README.md) section holds five
distributed systems designed end to end (URL shortener, rate limiter, Pastebin,
chat, notifications), plus mock-interview prompts and a scoring checklist. It is
kept because design decisions become operational problems: whether a redirect
can be revoked, whether a fan-out is push or pull, whether a rate limiter fails
open or closed.

## The site generator (sd365)

The site is built by **sd365**, a static site generator written from scratch for
this project. **Zero npm dependencies** — the only third-party code is a
vendored copy of the `marked` markdown parser. `git clone`, `node scripts/sd365.mjs build`,
done.

Markdown in, static HTML out, with BM25 full-text search that deep-links to the
matching heading, admonitions, Mermaid diagrams, tags, light/dark themes, and a
plugin architecture for search indexing, sitemaps, RSS, SEO and minification.
It builds the site in roughly 150 ms.

```bash
node scripts/sd365.mjs build       # build into dist/
node scripts/sd365.mjs serve       # dev server with live rebuild
node scripts/sd365.mjs new 04-kubernetes "Pods Stuck in Pending"
node scripts/sd365.mjs validate    # check links and frontmatter
node scripts/sd365.mjs doctor      # check config, sections, and plugins
```

[ARCHITECTURE.md](ARCHITECTURE.md) explains how it fits together, with diagrams.
There is also a **`template` branch**: the generator with an empty starter
`docs/`, ready to clone for your own documentation.

## Contributing

Corrections are more valuable than additions. If a case study describes a
Kubernetes behaviour that is wrong, a command that does not do what it claims,
or a root cause that would not actually produce those symptoms, **please open an
issue** — a corrected mistake is worth more than a star.

To add a case study, pick one marked *planned* in a domain index:

```bash
git clone https://github.com/sameeralam3127/devops-case-studies.git
cd devops-case-studies
node scripts/sd365.mjs serve
```

Write against [`templates/case-study.md`](templates/case-study.md), set
`status: published`, and open a PR. CI runs `sd365 validate` (broken links,
missing frontmatter) before deploying.

The quality bar, in order: technically correct, realistic scenario, actionable
investigation, honest trade-offs. A case study that cannot say what it costs or
what could still fail is not finished.

## Disclaimer

The scenarios are constructed for teaching. Company names, incident timelines,
traffic figures and error rates are illustrative. The failure mechanisms,
commands, configuration and reasoning are real and are written to be correct for
the versions named in each case study — but they are educational material, not
operational advice for your specific system. Test in a non-production
environment first, and prefer official documentation as the reference for
version-specific behaviour.

## License

- **Code** (`generator/`, `scripts/`, `assets/`, `templates/`) — [MIT](LICENSE)
- **Writing** (`docs/`) — [CC BY 4.0](LICENSE-CONTENT.md)

See [LICENSE-CONTENT.md](LICENSE-CONTENT.md) for the reasoning.
