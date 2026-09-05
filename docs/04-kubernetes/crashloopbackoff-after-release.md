---
title: CrashLoopBackOff After a Release
description: A payments API enters CrashLoopBackOff fifteen minutes after a routine deploy. Separating a bad image from a bad config from a bad dependency, under a 15-minute stabilisation budget.
tags: [kubernetes, incident, troubleshooting, probes, rollback, configmap]
type: troubleshooting
difficulty: medium
author: Sameer Alam
created: 2026-09-06
updated: 2026-09-06
status: published
---

## Scenario

It is 14:10 on a Tuesday. The `payments-api` Deployment was updated 12 minutes
ago as part of a normal release train — image tag `v2.31.0` replacing `v2.30.4`.
The rollout is stuck: 3 of 6 replicas are `CrashLoopBackOff`, the remaining 3
are still the old ReplicaSet and are carrying all traffic at roughly 2.2× their
usual load. Error rate at the edge is 12% and climbing as the surviving pods
start shedding requests.

You have a 15-minute stabilisation budget before the incident is escalated to a
customer-facing status page update. The temptation is to type
`kubectl rollout undo` immediately. Sometimes that is correct. Sometimes it
restores a service that is broken for a reason unrelated to the image, and you
have burned your only fast lever while the real cause keeps running.

The job in the next 15 minutes is not "find the root cause". It is **stabilise,
while collecting enough evidence that the root cause is findable afterwards.**

## Context

| Property | Value |
|---|---|
| Kubernetes | v1.29, managed control plane, 3 AZs |
| Workload | `payments-api`, Deployment, 6 replicas, `maxUnavailable: 0`, `maxSurge: 2` |
| Runtime | Go 1.22 service, distroless image |
| Config | ConfigMap `payments-api-config`, Secret `payments-api-secrets` (External Secrets Operator) |
| Dependencies | PostgreSQL (RDS), Redis (ElastiCache), an internal `fraud-check` gRPC service |
| Probes | `readinessProbe` and `livenessProbe` on `/healthz`, no `startupProbe` |
| Delivery | Argo CD, auto-sync enabled, self-heal on |

The Argo CD detail matters and is easy to forget under pressure: **with
auto-sync and self-heal enabled, `kubectl rollout undo` will be reverted by the
controller within a sync interval.** Any imperative fix is temporary unless you
also stop the reconciler or change Git.

## Symptoms

- `KubePodCrashLooping` firing for 3 pods in namespace `payments`.
- Edge error rate 12%, p99 latency on the surviving pods up 4×.
- Rollout stalled — `kubectl rollout status` never returns.
- No node-level alerts. Other workloads on the same nodes are healthy.

## Impact

**Technical.** Effective capacity is halved while demand is unchanged. The three
old pods are absorbing traffic they were never load-tested for; they are the
next thing to fall over. The rollout is stuck rather than failed, so Kubernetes
will keep the broken ReplicaSet alive and keep retrying.

**Business.** Payment authorisation failures. Unlike a read path, a failed
payment is not retried transparently by the user — a meaningful share of those
12% are abandoned carts, not deferred ones. There is also a reconciliation tail:
requests that failed *after* the downstream processor accepted them create
pending charges that need manual cleanup.

## Requirements

1. Restore full capacity within 15 minutes.
2. Do not lose the diagnostic state — logs of the crashed containers must be
   captured before they are garbage collected.
3. Do not create a second incident (a rollback to a version whose database
   migration has already been applied forward is its own outage).
4. Produce evidence that distinguishes image-caused from config-caused failure.

## Constraints

- **Zero-downtime requirement**: `maxUnavailable: 0` was chosen deliberately;
  reducing it to force the rollout through would trade one failure for another.
- **Forward-only migrations**: the team's migration policy is expand/contract,
  so a rollback is safe *only if* `v2.31.0` did not run a contracting migration.
- **Argo CD self-heal**: imperative changes are reverted automatically.
- **On-call is one engineer.** No parallel investigation.

## Initial Architecture

```text
                      ┌──────────────┐
   Internet ─────────▶│  Ingress/ALB │
                      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │   Service    │  payments-api:8080
                      └──────┬───────┘
                             │  endpoints = READY pods only
        ┌────────────────────┼────────────────────┐
        │                    │                    │
  ┌─────▼─────┐        ┌─────▼─────┐        ┌─────▼─────┐
  │ RS v2.30.4│        │ RS v2.31.0│        │ RS v2.31.0│
  │ 3 pods    │        │ CrashLoop │        │ CrashLoop │
  │ Ready     │        │ 0/1 Ready │        │ 0/1 Ready │
  └───────────┘        └───────────┘        └───────────┘
        │
        ├──▶ PostgreSQL (RDS, multi-AZ)
        ├──▶ Redis (ElastiCache)
        └──▶ fraud-check (gRPC, in-cluster)
```

Note what the diagram already tells you: the Service only routes to **ready**
pods, so the crashing pods are not serving errors — they are serving nothing.
The 12% error rate is coming from the *overloaded survivors*. That reframes the
priority: the fastest way to cut the error rate is to add capacity to the
working ReplicaSet, not to fix the broken one.

## Investigation

### 1. Establish the blast radius before touching anything

```bash
kubectl get pods -n payments -o wide \
  --sort-by=.status.containerStatuses[0].restartCount
```

You want three facts from this: how many pods are affected, whether they are
spread across nodes or concentrated on one, and how fast the restart counter is
climbing. **Concentrated on one node** points at the node (disk, kernel, a
failing CNI). **Spread evenly** points at the workload itself. Here they are
spread across all three AZs — the node is not the problem.

### 2. Read the pod's own account of what happened

```bash
kubectl describe pod -n payments payments-api-7d9f8b6c4-x2ktn
```

The three fields that matter, in order:

- **`Last State: Terminated`** with `Reason` and `Exit Code`. This is the single
  most informative field on the page.
- **`Events`** at the bottom — image pull failures, probe failures, scheduling
  problems and volume mount failures all surface here and nowhere else.
- **`Ready: False` plus a non-zero `Restart Count`** — confirms the pod never
  reached readiness rather than becoming unready later.

The exit code narrows the search dramatically:

| Exit code | Meaning | Where to look next |
|---|---|---|
| `0` | Process exited cleanly | Container has no long-running foreground process; entrypoint is wrong |
| `1` | Generic application error | Application logs — usually config or a failed dependency |
| `2` | Shell misuse / bad flag | Entrypoint or args |
| `126` | Command found but not executable | File mode, wrong architecture |
| `127` | Command not found | Bad entrypoint path, missing shell in a distroless image |
| `137` | SIGKILL (128+9) | OOMKilled, or a liveness probe kill that ignored SIGTERM |
| `139` | SIGSEGV (128+11) | Native crash, bad CGO, corrupt binary |
| `143` | SIGTERM (128+15) | Graceful shutdown requested — usually a liveness probe or eviction |

> [!IMPORTANT]
> `137` is not automatically OOM. Check `Reason: OOMKilled` explicitly. A
> container that ignores `SIGTERM` and is killed after `terminationGracePeriod`
> also exits `137`, and the fix is entirely different — see
> [OOMKilled Under Load](oomkilled-under-load.md) for the distinction.

In this incident: `Exit Code: 1`, `Reason: Error`, no `OOMKilled`.

### 3. Read the logs of the container that died, not the one that is starting

```bash
kubectl logs -n payments payments-api-7d9f8b6c4-x2ktn --previous
```

`--previous` is the whole point. Without it you get the logs of the *current*
attempt, which may still be in its first 200 ms and show nothing. With it you
get the terminated container's output — which is where a Go service prints its
fatal startup error.

If the pod has restarted enough times that the previous container has been
garbage collected, capture what exists immediately:

```bash
for p in $(kubectl get pods -n payments -l app=payments-api \
             -o jsonpath='{.items[*].metadata.name}'); do
  kubectl logs -n payments "$p" --previous --timestamps > "/tmp/$p.prev.log" 2>&1
  kubectl describe pod -n payments "$p" > "/tmp/$p.describe.txt"
done
```

**Do this before mitigating.** Rolling back deletes the pods and the evidence
with them.

### 4. Events give you the ordering that logs do not

```bash
kubectl get events -n payments --sort-by=.lastTimestamp | tail -40
```

Events are cluster-scoped truth about *scheduling and lifecycle*: `FailedMount`,
`ErrImagePull`, `Unhealthy`, `BackOff`, `FailedScheduling`. Two patterns worth
recognising instantly:

- `Unhealthy: Liveness probe failed` **before** any application error → the app
  is fine and the probe is wrong (too aggressive, or pointing at a port that
  only opens after warm-up).
- `BackOff: Back-off restarting failed container` with no other event → the
  container is exiting on its own; the answer is in the logs, not in Kubernetes.

### 5. Diff what actually changed

This is the step most people skip, and it is the one that separates a 15-minute
incident from a 90-minute one. The image tag changed — but did anything else?

```bash
# What Argo CD thinks changed
argocd app diff payments-api

# What the ReplicaSets differ by
kubectl get rs -n payments -l app=payments-api \
  --sort-by=.metadata.creationTimestamp
kubectl describe rs -n payments payments-api-7d9f8b6c4 | head -40

# Has the ConfigMap changed independently of the image?
kubectl get configmap -n payments payments-api-config -o yaml \
  | grep -A2 'creationTimestamp\|resourceVersion'
```

A ConfigMap edited an hour before the deploy, by someone else, is one of the
most common "the release broke it" causes that has nothing to do with the
release. The deploy simply became the first thing to *read* the broken config.

### 6. Reproduce outside the crash loop

If the logs are ambiguous, run the image with the same config but without the
entrypoint, so it cannot crash:

```bash
kubectl run payments-debug -n payments --rm -it --restart=Never \
  --image=<registry>/payments-api:v2.31.0 \
  --overrides='{"spec":{"containers":[{"name":"payments-debug",
    "image":"<registry>/payments-api:v2.31.0",
    "command":["/bin/sh"],"stdin":true,"tty":true,
    "envFrom":[{"configMapRef":{"name":"payments-api-config"}}]}]}}' \
  -- sh
```

With a distroless image there is no shell, so instead use an ephemeral debug
container attached to a live (crashing) pod, which shares its namespaces:

```bash
kubectl debug -n payments payments-api-7d9f8b6c4-x2ktn \
  -it --image=busybox:1.36 --target=payments-api
```

From inside, verify the three things that config bugs break: DNS resolution of
each dependency, TCP reachability, and the actual mounted values.

```bash
nslookup fraud-check.payments.svc.cluster.local
nc -zv payments-db.abc123.eu-west-1.rds.amazonaws.com 5432
cat /etc/payments/config.yaml
```

## Root Cause

Candidate causes, and the evidence that separates them:

| Candidate | Confirming evidence | Ruled out by |
|---|---|---|
| Bad image / broken binary | Exit `127` or `139`; crash before any log line | Application logged a structured startup error |
| Missing or malformed config | Exit `1` with a parse/validation error naming the key | Config identical to the working ReplicaSet |
| Missing secret | `CreateContainerConfigError`, or auth failure in logs | Secret exists and `ExternalSecret` is `SecretSynced` |
| Failed migration / schema mismatch | SQL error naming a column or table | Migration job completed and schema matches |
| Dependency unavailable | Connection refused / timeout to a named host | Dependency healthy from a debug pod |
| OOM at startup | `Reason: OOMKilled`, exit `137` | `Reason: Error`, exit `1` |
| Probe too aggressive | `Unhealthy` events precede the app error | No `Unhealthy` events before the first crash |

In this case the `--previous` logs read:

```
{"level":"fatal","ts":"2026-09-06T14:00:11Z","msg":"config validation failed",
 "error":"fraud_check.timeout_ms: required field missing"}
```

**Root cause:** `v2.31.0` added a required configuration key,
`fraud_check.timeout_ms`, and validated it at startup. The corresponding
ConfigMap change lived in a separate Git repository (`payments-config`) from
the application chart, and its pull request had not merged. The image shipped;
the config did not.

The deeper cause is structural, not human: **the config schema and the config
value were in two repositories with no coupling between them**, so nothing could
have caught the mismatch before runtime.

## Solution

Three moves, in this order.

### Immediate (minutes 0–5): restore capacity, not correctness

The surviving ReplicaSet is healthy. Give it the capacity it needs:

```bash
kubectl scale deployment payments-api -n payments --replicas=10
```

Because `maxSurge: 2` and `maxUnavailable: 0`, this brings up more *new*
(crashing) pods too — which is useless. So first pause the rollout, which pins
the Deployment and lets the old ReplicaSet scale:

```bash
kubectl rollout pause deployment/payments-api -n payments
```

Pausing is the underused lever here. It stops the controller from creating more
doomed pods, keeps the working pods alive, and — unlike `rollout undo` — is
non-destructive and instantly reversible.

### Mitigation (minutes 5–10): roll back through Git, not kubectl

With Argo CD self-heal on, the durable rollback is a Git revert:

```bash
git -C payments-chart revert --no-edit <deploy-commit-sha>
git -C payments-chart push
argocd app sync payments-api
```

If Git is unavailable or too slow, disable self-heal first so the imperative
rollback survives:

```bash
argocd app set payments-api --sync-policy none
kubectl rollout undo deployment/payments-api -n payments
```

**Before rolling back, answer one question:** did `v2.31.0` run a contracting
migration? If it dropped a column that `v2.30.4` still writes to, the rollback
is a second outage.

```bash
kubectl get jobs -n payments -l app=payments-api-migrate \
  --sort-by=.metadata.creationTimestamp
kubectl logs -n payments job/payments-api-migrate-v2-31-0 | tail -30
```

Here the migration was additive (a new nullable column), so rollback is safe.

### Fix forward (minutes 10–15): if the config is the only thing missing

Rolling back is not always the fastest route. When the missing piece is a single
config key, applying it is one commit and no schema risk:

```yaml
# payments-config/overlays/prod/payments-api-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: payments-api-config
  namespace: payments
data:
  config.yaml: |
    fraud_check:
      endpoint: fraud-check.payments.svc.cluster.local:9090
      timeout_ms: 250          # ← the key v2.31.0 requires
      max_retries: 2
```

> [!WARNING]
> A ConfigMap mounted as a volume updates in place, but the application only
> re-reads it if it watches the file. A ConfigMap consumed via `envFrom` does
> **not** update in a running container at all. Neither triggers a rollout by
> itself. If you change config and nothing happens, that is why — you need a
> checksum annotation on the pod template.

## Architecture

The fix that prevents recurrence changes the *shape* of the delivery path, not
just the value of one key:

```text
BEFORE — schema and value in different repos, coupled only by hope

  payments-api repo ──build──▶ image v2.31.0 ──┐
   (defines required keys)                     ├──▶ cluster ──▶ crash
  payments-config repo ─────── config v9 ──────┘
   (supplies values, PR unmerged)


AFTER — schema travels with the image, validated before the cluster sees it

  payments-api repo
    ├── config.schema.json  (generated from the Go struct tags)
    └── build ──▶ image + schema attached as an OCI artifact
                          │
  payments-config repo     │
    └── values ──▶ CI: validate values against schema ──┐
                                                        │ fails PR
                          ┌─────────────────────────────┘
                          ▼
                    Argo CD PreSync hook
                    (re-validates at deploy time)
                          │
                          ▼
                    Rollout with startupProbe
                    (fails fast, no traffic shifted)
```

## Implementation

### 1. Make a bad config fail the deploy, not the pod

An Argo CD `PreSync` hook runs to completion before any workload is updated. A
failing hook aborts the sync — the existing pods are never touched.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: payments-api-config-validate
  namespace: payments
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: validate
          image: <registry>/payments-api:v2.31.0
          args: ["--config", "/etc/payments/config.yaml", "--validate-only"]
          volumeMounts:
            - name: config
              mountPath: /etc/payments
              readOnly: true
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits:   { memory: 128Mi }
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            capabilities: { drop: ["ALL"] }
      volumes:
        - name: config
          configMap:
            name: payments-api-config
```

The `--validate-only` flag is the important part and it belongs in the
application, not in a script. The binary that will consume the config is the
only thing that can authoritatively say the config is valid for it.

### 2. Roll config changes properly

Without this annotation, editing a ConfigMap changes nothing that is running.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: payments
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 2
  selector:
    matchLabels: { app: payments-api }
  template:
    metadata:
      labels: { app: payments-api }
      annotations:
        # Changes to the ConfigMap now produce a new pod template hash,
        # so a config-only change rolls like any other change.
        checksum/config: "{{ include (print $.Template.BasePath \"/configmap.yaml\") . | sha256sum }}"
    spec:
      terminationGracePeriodSeconds: 45
      containers:
        - name: payments-api
          image: <registry>/payments-api:v2.31.0
          ports:
            - { name: http, containerPort: 8080 }
          # Fail fast and loudly at startup rather than crash-looping silently.
          startupProbe:
            httpGet: { path: /healthz/startup, port: http }
            periodSeconds: 2
            failureThreshold: 30        # 60s budget for a slow start
          readinessProbe:
            httpGet: { path: /healthz/ready, port: http }
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet: { path: /healthz/live, port: http }
            periodSeconds: 10
            failureThreshold: 3
          resources:
            requests: { cpu: 200m, memory: 256Mi }
            limits:   { memory: 512Mi }
```

> [!NOTE]
> Three probes, three questions. `startupProbe`: has it finished booting?
> `readinessProbe`: should it receive traffic right now? `livenessProbe`: is it
> wedged and in need of a restart? Using one probe for all three is the most
> common probe mistake, and it produces exactly this failure mode — a slow start
> gets killed by liveness, forever.

### 3. Separate the health endpoints

A single `/healthz` that checks dependencies is a footgun: when the database
blips, liveness fails, every pod restarts simultaneously, and a recoverable
dependency problem becomes a total outage.

```go
// /healthz/live — is this process wedged? Nothing external. Never fails
// because a dependency is down.
mux.HandleFunc("/healthz/live", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
})

// /healthz/ready — should the Service send me traffic? Dependencies count here,
// because a pod that cannot reach the DB should be removed from endpoints.
mux.HandleFunc("/healthz/ready", func(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)
    defer cancel()
    if err := db.PingContext(ctx); err != nil {
        http.Error(w, "db: "+err.Error(), http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
})

// /healthz/startup — has initialisation completed? Flips once and stays true.
mux.HandleFunc("/healthz/startup", func(w http.ResponseWriter, r *http.Request) {
    if !initialised.Load() {
        http.Error(w, "initialising", http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
})
```

### 4. Capture crash evidence automatically

Crash-loop logs are lost to garbage collection. A small controller that copies
them out on transition turns "we did not have the logs" into a non-event.

```bash
#!/usr/bin/env bash
# crashloop-capture.sh — run from a CronJob every minute in the cluster.
set -euo pipefail
NS="${1:-payments}"
DEST="${2:-/var/log/crash-capture}"
mkdir -p "$DEST"

kubectl get pods -n "$NS" \
  -o jsonpath='{range .items[?(@.status.containerStatuses[0].restartCount>0)]}{.metadata.name}{"\n"}{end}' \
| while read -r pod; do
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    out="$DEST/${NS}_${pod}_${stamp}"
    kubectl logs   -n "$NS" "$pod" --previous --timestamps > "${out}.prev.log" 2>/dev/null || true
    kubectl describe pod -n "$NS" "$pod"                   > "${out}.describe.txt" 2>/dev/null || true
  done
```

In practice, prefer an operator that watches Pod events rather than a polling
CronJob — [KubeRescue](https://github.com/sameeralam3127/KubeRescue) is built
around exactly this pattern of detecting a failure state and acting on it under
policy.

## Observability

**The alert that should have fired first** is not `KubePodCrashLooping` — it is
a rollout that has not converged.

```promql
# A Deployment whose desired and updated-available replicas disagree
# for longer than a normal rollout takes.
(
  kube_deployment_spec_replicas{namespace="payments"}
  -
  kube_deployment_status_replicas_available{namespace="payments"}
) > 0
```

Alert on this `for: 10m` and you catch a stuck rollout before the surviving
pods are overloaded — which is the actual customer-facing failure.

Supporting signals:

```promql
# Restart rate per pod — the definitive crash-loop signal.
increase(kube_pod_container_status_restarts_total{namespace="payments"}[15m]) > 3

# Containers currently waiting in CrashLoopBackOff.
kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} == 1

# Capacity headroom on the surviving ReplicaSet — this is the one that
# predicts the *next* failure.
sum(rate(http_requests_total{app="payments-api"}[5m]))
  / count(kube_pod_status_ready{condition="true", pod=~"payments-api-.*"})
```

**Logs.** The fatal line must be structured and must name the failing field.
`"config validation failed: fraud_check.timeout_ms: required field missing"` is
a 30-second diagnosis. `"startup error"` is a 30-minute one. Ship stdout to Loki
and keep a `namespace`/`pod`/`container` label set so `--previous` logs remain
queryable after the pod is gone.

**Dashboard panels**, in the order an on-call reads them: rollout progress
(desired vs available), restart count by pod, exit-code distribution, error rate
at the edge, and per-pod request rate (which reveals overload of the survivors).

## Security

- **Do not paste logs into a shared channel unfiltered.** A payments service's
  startup logs routinely contain connection strings, and a fatal error often
  includes the value that failed to parse.
- The debug path matters: `kubectl debug --target` shares the target's process
  and network namespaces, so an engineer with debug rights effectively has the
  container's network identity. Gate `pods/ephemeralcontainers` behind a
  break-glass role, not the default on-call role.
- `--validate-only` must never log secret *values* — validate and report the
  key name only.
- Ephemeral debug images (`busybox`, `netshoot`) should come from your own
  registry and be scanned, not pulled from Docker Hub at 03:00.

## Reliability

- **Failure domain**: this failure was workload-scoped, not node- or
  zone-scoped. The evidence was the even spread across AZs. Always establish
  that spread first, because it eliminates entire categories of cause.
- **`maxUnavailable: 0` is what saved you.** It is why 3 old pods survived to
  serve traffic. With `maxUnavailable: 1` and `maxSurge: 1`, the same bug would
  have taken the service to zero.
- **PodDisruptionBudget** protects against voluntary disruption during the
  incident — a node drain at the wrong moment would take out the survivors:

  ```yaml
  apiVersion: policy/v1
  kind: PodDisruptionBudget
  metadata: { name: payments-api, namespace: payments }
  spec:
    minAvailable: 3
    selector:
      matchLabels: { app: payments-api }
  ```

- **`progressDeadlineSeconds`** (default 600) marks the Deployment
  `ProgressDeadlineExceeded` — make sure something alerts on that condition
  rather than waiting for a human to notice a hanging `rollout status`.
- **Rollback safety** comes from the migration policy, not from Kubernetes.
  Expand/contract (add nullable column → deploy code that writes both → deploy
  code that reads new → drop old, one release later) is what makes
  `rollout undo` a safe reflex.

## Cost Considerations

The costs here are mostly indirect:

- **Overprovisioning as insurance.** Running 6 replicas where 4 would do is
  paying continuously for headroom during failed rollouts. Whether that is worth
  it depends on how often rollouts fail — measure it rather than assuming.
- **Log retention.** Crash-loop pods can produce a very high log rate (a pod
  restarting every 10 s for an hour). Retention costs scale with that, and the
  spike is exactly when you cannot afford to be dropping lines. Rate limiting at
  the collector is safer than reducing retention.
- **Emergency scale-out** (the `--replicas=10` above) costs real money if the
  cluster autoscaler adds nodes. Budget for it, and make sure the scale-down is
  in the runbook — forgotten emergency capacity is a recurring line item.
- The cheapest fix in this entire document is the `PreSync` validation job. It
  costs 50 mCPU for a few seconds per deploy and prevents the whole incident.

## Trade-offs

| Decision | Chosen | Alternative | Why |
|---|---|---|---|
| First action | `rollout pause` + scale old RS | `rollout undo` immediately | Pause is non-destructive and preserves evidence; undo is irreversible and can trip a migration mismatch |
| Rollback mechanism | Git revert through Argo CD | `kubectl rollout undo` | Self-heal reverts imperative changes; Git revert is durable and auditable |
| Config validation | PreSync hook running the real binary | A CI schema check only | CI validates the config repo in isolation; the hook validates the *combination* actually being deployed |
| Probe design | Three separate probes | One `/healthz` for all | A shared endpoint turns a dependency blip into a cluster-wide restart storm |
| Startup failure handling | `startupProbe` + fail fast | Long liveness `initialDelaySeconds` | `initialDelaySeconds` is a fixed guess; `startupProbe` adapts and reports distinctly |
| Config coupling | Schema shipped with the image | Keep repos independent | Independence was the root cause; coupling the schema is the minimum viable fix |

The honest cost of the chosen approach: the `PreSync` hook adds 10–20 seconds to
every deploy and introduces a new thing that can fail (a hook that hangs blocks
all deploys). Set `activeDeadlineSeconds` on it and alert on hook failures.

## Failure Scenarios

Things that still break after all of the above:

1. **The PreSync hook passes and the app still crashes.** Validation covers
   syntax and required keys, not semantics — `timeout_ms: 1` is valid and
   catastrophic. Mitigation: canary the release to one replica first.
2. **A dependency fails during rollout.** New pods cannot reach the database, so
   readiness never succeeds and the rollout stalls. This looks identical to a bad
   image from the outside. The distinguishing evidence: old pods are *also*
   unhealthy.
3. **The registry is unavailable.** `ErrImagePull`/`ImagePullBackOff` rather than
   `CrashLoopBackOff` — different symptom, and the rollback also fails if the
   old image was garbage-collected from the node. Set
   `imagePullPolicy: IfNotPresent` for pinned digests and keep old images in
   the registry lifecycle policy.
4. **Rollback into a contracted schema.** The worst case in this document.
   Prevented by policy, not tooling.
5. **Self-heal fights you.** Someone disables self-heal to mitigate and forgets
   to re-enable it. Two weeks later the cluster has silently drifted. Alert on
   `argocd_app_info{sync_policy="none"}` persisting beyond an hour.

## Runbook

**Trigger:** `KubePodCrashLooping` or `DeploymentRolloutStuck` in `payments`.

```text
 1. Confirm scope
    kubectl get pods -n payments -o wide
    → spread across nodes?  yes → workload    no → suspect the node

 2. Stop making it worse
    kubectl rollout pause deployment/payments-api -n payments

 3. Capture evidence (BEFORE mitigating)
    ./crashloop-capture.sh payments /tmp/incident-$(date +%s)

 4. Classify
    kubectl describe pod -n payments <pod> | grep -A5 "Last State"
    → OOMKilled / 137  → see 04-kubernetes/oomkilled-under-load.md
    → 127 / 126        → image or entrypoint; roll back
    → 1                → read --previous logs; usually config or dependency

 5. Restore capacity from the healthy ReplicaSet
    kubectl scale deployment payments-api -n payments --replicas=10

 6. Check rollback safety
    kubectl logs -n payments job/payments-api-migrate-<version> | tail -30
    → contracting migration present? DO NOT ROLL BACK. Fix forward.

 7. Mitigate
    git revert <sha> && git push && argocd app sync payments-api
    (or: argocd app set payments-api --sync-policy none
         kubectl rollout undo deployment/payments-api -n payments)

 8. Verify
    kubectl rollout status deployment/payments-api -n payments --timeout=5m
    watch edge error rate for 10 minutes at pre-incident levels

 9. Restore steady state
    kubectl scale deployment payments-api -n payments --replicas=6
    argocd app set payments-api --sync-policy automated --self-heal
    kubectl rollout resume deployment/payments-api -n payments

10. Open the postmortem doc while the timeline is still in your terminal
    history.
```

## Prevention

| Control | Catches | Where it runs |
|---|---|---|
| Config schema generated from the app's own types | Missing/renamed required keys | Application build |
| CI validation of config repo against the schema | Bad values before merge | Config repo PR |
| Argo CD `PreSync` validation job | Bad *combinations* of image + config | Deploy time, before pods change |
| `startupProbe` | Slow starts being liveness-killed | Runtime |
| Separate live/ready/startup endpoints | Dependency blips causing restart storms | Runtime |
| `checksum/config` annotation | Config changes that silently do not roll | Chart |
| Canary one replica before full rollout | Semantically valid but wrong config | Deploy |
| `maxUnavailable: 0` | Total capacity loss on a bad release | Deployment spec |
| Expand/contract migrations | Unsafe rollbacks | Team policy + migration lint |

The single highest-leverage item is the first one. Everything else catches the
failure later and more expensively.

## Postmortem

**Incident:** `payments-api` partial outage — 2026-09-06, 14:12–14:41 UTC
**Severity:** SEV-2 · **Duration:** 29 min · **Error budget consumed:** 41% of month

### Timeline (UTC)

| Time | Event |
|---|---|
| 13:58 | `v2.31.0` merged; Argo CD begins sync |
| 14:00 | First new pod starts and exits 1 |
| 14:04 | Third restart; `CrashLoopBackOff` |
| 14:10 | `KubePodCrashLooping` fires; on-call paged |
| 14:12 | Edge error rate crosses 5%; incident declared |
| 14:15 | Rollout paused; evidence captured |
| 14:18 | `--previous` logs identify the missing config key |
| 14:22 | Migration confirmed additive; rollback deemed safe |
| 14:25 | Config PR merged in `payments-config` (fix forward chosen over rollback) |
| 14:31 | Argo CD sync completes; new pods pass readiness |
| 14:38 | Error rate back to baseline |
| 14:41 | Incident closed; replicas returned to 6 |

### Root cause

`v2.31.0` introduced a required configuration key. The value lived in a
different repository whose pull request had not merged. No mechanism coupled the
two, so the mismatch was only discoverable at container start.

### Contributing factors

1. Config schema and config values in separate repositories with no shared
   validation.
2. No `startupProbe`; the failure presented as a generic crash loop.
3. No alert on stalled rollouts — detection depended on the crash-loop alert,
   which fires later.
4. The release ran outside the change-freeze calendar with no canary stage.
5. `--previous` log capture was manual; two pods had already GC'd their logs.

### Detection

Automated, via `KubePodCrashLooping`, 12 minutes after the first failure.
**Detection was the weakest link** — a stalled-rollout alert would have fired at
roughly 14:04.

### Mitigation

Rollout paused, healthy ReplicaSet scaled to absorb load, then fixed forward by
merging the missing config.

### Resolution

Config key added; rollout completed normally.

### Corrective actions

| # | Action | Owner | Due |
|---|---|---|---|
| 1 | Generate `config.schema.json` from application types; publish with the image | payments | 2026-09-20 |
| 2 | Add schema validation to `payments-config` CI | platform | 2026-09-20 |
| 3 | Add Argo CD `PreSync` validation hook | platform | 2026-09-13 |
| 4 | Add `startupProbe` and split health endpoints | payments | 2026-09-13 |
| 5 | Alert on `DeploymentRolloutStuck` (`for: 10m`) | platform | 2026-09-13 |
| 6 | Automate crash-loop log capture | platform | 2026-09-27 |
| 7 | Add single-replica canary stage to the release pipeline | platform | 2026-10-04 |

## Interview Questions

1. A pod is in `CrashLoopBackOff`. Walk me through your first five commands and
   what each one rules out.
2. `kubectl logs <pod>` returns nothing. What do you do next, and why?
3. What is the difference between exit code 137 with `Reason: OOMKilled` and
   exit code 137 without it?
4. Your liveness and readiness probes both hit `/healthz`, which checks the
   database. The database has a 30-second blip. Describe what happens to the
   cluster.
5. Argo CD has auto-sync and self-heal enabled. You run `kubectl rollout undo`
   and the service recovers, then breaks again four minutes later. Why?
6. When is rolling back the *wrong* mitigation for a bad deploy?
7. You change a ConfigMap and nothing happens. Give two reasons and the fix for
   each.
8. How does CrashLoopBackOff's backoff behave, and why does the delay make
   diagnosis harder over time?
9. Design a control that would have caught this failure before any pod was
   created. Where in the pipeline does it belong, and what does it cost?
10. `maxUnavailable: 0` kept half the capacity alive here. When would you
    deliberately not use it?

## Key Takeaways

- **A crash-looping pod is not serving errors — it is serving nothing.** The
  customer-visible failure comes from the pods that survived. Restore their
  capacity first.
- **Pause before you undo.** `rollout pause` is non-destructive, reversible, and
  preserves the evidence that `rollout undo` deletes.
- **The exit code is the fastest classifier available.** Read `Last State`
  before you read logs.
- **`--previous` or nothing.** Current-container logs from a crash loop are
  usually empty.
- **A rollback is only safe if your migrations are.** That is a policy property,
  not a Kubernetes feature.
- **Config that the application requires but does not ship with is a latent
  outage.** Couple the schema to the binary.
- **One health endpoint for three questions turns a dependency blip into a
  restart storm.**

## Related Projects

- **[KubeRescue](https://github.com/sameeralam3127/KubeRescue)** — a Go engine
  for autonomous Kubernetes failure detection and policy-driven auto-remediation.
  The detection half of this case study (identify `CrashLoopBackOff`, classify by
  exit code, capture evidence, act under policy) is precisely the problem it
  addresses.
- **[Kubernetes Platform](https://github.com/sameeralam3127/kubernetes-platform)**
  — the GitOps, CI/CD and observability wiring that the prevention controls in
  this document assume exists.

**Related case studies:** [OOMKilled Under Load](oomkilled-under-load.md)

*Planned:* Pods Stuck in Pending · Argo CD Configuration Drift · Rollback Safety
and Failed Deployments.
