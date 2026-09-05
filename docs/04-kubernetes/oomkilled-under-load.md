---
title: OOMKilled Under Load
description: A JVM service is killed by the kernel every few hours under peak traffic while its own heap metrics look healthy. Reading cgroup accounting, off-heap memory, and why raising the limit is usually the wrong fix.
tags: [kubernetes, memory, oomkill, cgroups, jvm, resources, troubleshooting]
type: troubleshooting
difficulty: hard
author: Sameer Alam
created: 2026-09-06
updated: 2026-09-06
status: published
---

## Scenario

`catalog-service` — a Java 21 Spring Boot application, 12 replicas — has been
restarting between two and nine times a day for three weeks. Restarts cluster
around the 12:00–14:00 and 19:00–21:00 traffic peaks. Each restart drops
in-flight requests and takes 40 seconds of warm-up before the pod is useful
again, so the user-visible symptom is a latency spike, not an outage.

The team's response so far has been to raise the memory limit. It has gone from
1Gi to 1.5Gi to 2Gi. Each increase bought about a week. The JVM's own
`jvm_memory_used_bytes{area="heap"}` peaks at 60% of `-Xmx`, so from the
application's point of view nothing is wrong.

That contradiction — healthy heap, dead container — is the entire case study.

## Context

| Property | Value |
|---|---|
| Kubernetes | v1.29, containerd 1.7, cgroup v2 |
| Nodes | `m6i.2xlarge`, 8 vCPU / 32 GiB, 3 AZs |
| Workload | `catalog-service`, 12 replicas, `requests.memory: 2Gi`, `limits.memory: 2Gi` |
| Runtime | OpenJDK 21, `-XX:MaxRAMPercentage=75` |
| Traffic | ~4 000 rps at peak, response payloads up to 2 MB |
| Extras | Sidecar: Envoy (Istio), 128Mi limit |

## Symptoms

- `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}` fires
  during peaks.
- `kubectl describe pod` shows `Last State: Terminated · Reason: OOMKilled ·
  Exit Code: 137`.
- Heap utilisation never exceeds ~60% of max.
- No `OutOfMemoryError` in the application logs — the JVM never gets the chance
  to throw one.
- `container_memory_working_set_bytes` climbs steadily and hits the limit exactly.

## Impact

**Technical.** Each kill drops every in-flight request on that pod (SIGKILL, not
SIGTERM — there is no graceful shutdown from an OOM kill). At 4 000 rps across
12 pods, a kill drops roughly 330 rps' worth of in-flight work, plus 40 s of
reduced capacity while the replacement warms up.

**Business.** Catalog is on the critical path for browse and search. p99 latency
during a restart window rises from 180 ms to 2.4 s; conversion measurably dips.
The bigger cost is trust: three weeks of "we raised the limit again" has trained
the team to treat OOM as a tuning parameter rather than a bug.

## Requirements

1. Eliminate OOM kills at peak without unbounded memory growth in the limit.
2. Identify *which* memory region is growing — heap, metaspace, native, or the
   page cache attributed to the cgroup.
3. Make future memory regressions visible before they kill anything.
4. No change to request-handling semantics; this is not a rewrite.

## Constraints

- The node has 32 GiB; 12 replicas at 2Gi each is already 24 GiB of *requests*
  across the fleet. Raising limits further reduces schedulable density and costs
  nodes.
- `requests == limits` was chosen deliberately for Guaranteed QoS. Breaking that
  changes eviction behaviour.
- The service cannot be taken offline for profiling.
- Team of four; no dedicated JVM performance engineer.

## Initial Architecture

```text
  Node (m6i.2xlarge, 32 GiB)
  ┌────────────────────────────────────────────────┐
  │  kubelet + system reserved                     │
  │                                                │
  │  Pod: catalog-service            limit 2Gi ────┼──▶ cgroup memory.max = 2Gi
  │   ├── container: app  (JVM, MaxRAMPercentage 75)│    counts: heap + metaspace
  │   │      -Xmx ≈ 1.5Gi                           │    + code cache + threads
  │   │                                             │    + direct buffers
  │   │                                             │    + malloc arenas
  │   │                                             │    + page cache (!)
  │   └── container: envoy (128Mi limit)            │
  │                                                │
  │  ... 11 more catalog pods                      │
  └────────────────────────────────────────────────┘
```

The critical misunderstanding baked into the original sizing: the team set
`-Xmx` to 75% of the *container limit* and assumed the remaining 25% was slack.
It is not slack. It is where every non-heap allocation lives, and several of
those scale with concurrency and payload size.

## Investigation

### 1. Confirm it is an OOM kill, and whose

```bash
kubectl describe pod -n catalog catalog-service-6b8f7d9c5-mn4pq \
  | sed -n '/Last State/,/Ready/p'
```

Two different things both present as "OOM":

- **Container OOM (cgroup limit)** — `Reason: OOMKilled` on the container.
  The kernel's cgroup OOM killer fired because that cgroup hit `memory.max`.
  Only this container is affected.
- **Node OOM (system pressure)** — the node runs out and the global OOM killer
  picks a victim by `oom_score_adj`. You will also see `SystemOOM` node events
  and, usually, several unrelated pods dying together.

Distinguish them:

```bash
kubectl get events -A --field-selector reason=OOMKilling
kubectl get events -A --field-selector reason=SystemOOM
kubectl describe node <node> | sed -n '/Conditions/,/Addresses/p'
```

Here: container-level, single container, `MemoryPressure: False` on the node.
The node is fine; the pod's own budget is exceeded.

### 2. Find out *which* container in the pod died

A pod with a sidecar has two candidates and the alert usually does not say which.

```bash
kubectl get pod -n catalog catalog-service-6b8f7d9c5-mn4pq \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\t"}{.lastState.terminated.reason}{"\t"}{.lastState.terminated.exitCode}{"\n"}{end}'
```

```
app     OOMKilled       137
envoy   <none>          <none>
```

The app, not the sidecar. Worth checking every time — a 128Mi Envoy limit is a
very common silent killer under connection-heavy load.

### 3. Read the cgroup accounting directly

`container_memory_usage_bytes` includes reclaimable page cache and will scare
you for no reason. The number the kernel actually kills on is closer to the
working set.

```bash
kubectl exec -n catalog catalog-service-6b8f7d9c5-mn4pq -c app -- \
  sh -c 'cat /sys/fs/cgroup/memory.max; cat /sys/fs/cgroup/memory.current; cat /sys/fs/cgroup/memory.stat'
```

On cgroup v2, `memory.stat` is the highest-value output in this entire
investigation:

| Field | What it tells you |
|---|---|
| `anon` | Anonymous memory — heap, thread stacks, direct buffers, malloc arenas. **Not reclaimable.** |
| `file` | Page cache from files this cgroup read. Mostly reclaimable. |
| `kernel_stack` | Kernel stacks — scales with thread count |
| `slab` | Kernel objects (dentries, inodes) — grows with file churn |
| `sock` | Socket buffers — scales with connection count |
| `shmem` | Shared memory / tmpfs, including `emptyDir: medium: Memory` |

> [!IMPORTANT]
> An `emptyDir` with `medium: Memory` is a tmpfs. Everything written to it is
> `shmem` and **counts against the container's memory limit**. Writing a 400 MB
> temp file to `/tmp` backed by a memory-medium emptyDir is a memory allocation,
> not a disk write. This surprises people every time.

Observed at peak: `anon` ≈ 1.78 GiB against a 2 GiB limit. Heap is ~0.9 GiB of
that. So roughly 880 MiB of non-heap anonymous memory — far more than the JVM's
usual overhead.

### 4. Ask the JVM what it thinks it is using

Native Memory Tracking is the only way to attribute non-heap JVM memory
properly. Enable it (it costs 5–10% overhead, acceptable on one canary pod):

```yaml
env:
  - name: JAVA_TOOL_OPTIONS
    value: "-XX:NativeMemoryTracking=summary -XX:+UnlockDiagnosticVMOptions"
```

Then:

```bash
kubectl exec -n catalog <pod> -c app -- jcmd 1 VM.native_memory summary
```

```
Total: reserved=3.2GB, committed=1.71GB
-   Java Heap (reserved=1.50GB, committed=0.90GB)
-        Class (reserved=0.26GB, committed=0.08GB)     # metaspace + class space
-       Thread (reserved=0.42GB, committed=0.42GB)     # ← 420 threads × 1MB stacks
-         Code (reserved=0.25GB, committed=0.06GB)
-           GC (reserved=0.10GB, committed=0.09GB)
-     Internal (reserved=0.01GB, committed=0.01GB)
-       Symbol (reserved=0.02GB, committed=0.02GB)
-        Other (reserved=0.31GB, committed=0.31GB)     # ← direct byte buffers
```

Two lines stand out: **420 MB of thread stacks** and **310 MB of direct
buffers**. Neither is heap. Neither appears in `jvm_memory_used_bytes{area="heap"}`.

### 5. Correlate with load

```promql
# Working set vs the limit, per pod
container_memory_working_set_bytes{container="app", namespace="catalog"}
  / on(pod) group_left
  kube_pod_container_resource_limits{resource="memory", container="app"}

# Thread count — the hypothesis is that this tracks memory
jvm_threads_live_threads{app="catalog-service"}

# Direct buffer pool
jvm_buffer_memory_used_bytes{id="direct", app="catalog-service"}
```

Overlaying these three: threads and direct buffers both track request
concurrency almost exactly. Heap does not. **Memory growth is proportional to
concurrency, not to data volume.**

### 6. Distinguish a leak from correct-but-unbounded growth

This is the distinction that determines the fix.

```bash
# Does memory return to baseline after peak?
kubectl exec -n catalog <pod> -c app -- jcmd 1 GC.heap_info

# Are threads returned to the pool, or accumulating?
kubectl exec -n catalog <pod> -c app -- jcmd 1 Thread.print | grep -c '^"'
```

A **leak** shows monotonic growth that survives GC and idle periods. **Unbounded
growth under load** returns to baseline when load drops. Here memory returned to
~1.1 GiB overnight and climbed again at peak: not a leak. The service is
correctly allocating memory it is entitled to allocate — there is simply no
ceiling on how much concurrency it will accept.

## Root Cause

**Immediate cause.** The container is killed by the cgroup OOM killer because
total anonymous memory — heap plus thread stacks plus direct NIO buffers —
exceeds `memory.max` at peak concurrency.

**Contributing mechanism.** Three compounding factors:

1. `-XX:MaxRAMPercentage=75` sizes the heap against the container limit, leaving
   25% (512 MiB) for *everything else*. Thread stacks alone consumed 420 MiB.
2. The HTTP server thread pool has no effective upper bound
   (`server.tomcat.threads.max` left at the default 200, but two additional
   executor pools were created per-request-type and unbounded). At peak, 420
   live threads × 1 MiB default stack = 420 MiB.
3. Response payloads up to 2 MB are serialised through direct `ByteBuffer`s.
   Direct buffer memory is bounded by `-XX:MaxDirectMemorySize`, which
   **defaults to the heap max** — so the JVM would happily allocate another
   1.5 GiB of off-heap buffers before complaining.

**Root cause.** The memory budget was never modelled. `-Xmx` was set as a
percentage of the limit rather than derived from `limit − (measured non-heap
requirement)`, and no component of non-heap memory had an enforced ceiling.

Raising the limit worked temporarily because it raised `-Xmx` proportionally,
which slightly delayed GC pressure — while also raising the default
`MaxDirectMemorySize`. Each increase made the ceiling higher *and* the demand
higher. That is why it kept coming back on roughly the same schedule.

## Solution

Work the budget from the outside in, and put a hard ceiling on every region.

```text
Container limit                                  2048 MiB
  − non-JVM overhead (libc, malloc arenas)       ~ 120 MiB
  − thread stacks   (bounded: 250 × 512 KiB)     ~ 128 MiB
  − metaspace       (bounded: -XX:MaxMetaspaceSize=256m)  256 MiB
  − code cache      (-XX:ReservedCodeCacheSize=128m)      128 MiB
  − direct buffers  (-XX:MaxDirectMemorySize=256m)        256 MiB
  − GC structures + symbol + internal            ~ 128 MiB
  ────────────────────────────────────────────────────────
  = available for heap                           ~1032 MiB  →  -Xmx 960m
```

The point is not the exact arithmetic — it is that **every line has an enforced
maximum**, so the total cannot exceed the limit no matter what traffic does.

## Architecture

```text
BEFORE                                  AFTER

 limit 2Gi                               limit 2Gi
 ├─ heap  -Xmx 1.5Gi  (75%)              ├─ heap  -Xmx 960m      [hard]
 ├─ threads  UNBOUNDED ────┐             ├─ threads  250×512K    [hard]
 ├─ direct   UNBOUNDED ────┼─▶ OOM       ├─ metaspace 256m       [hard]
 ├─ metaspace UNBOUNDED ───┘             ├─ code cache 128m      [hard]
 └─ code cache default                   ├─ direct 256m          [hard]
                                         └─ headroom ~120m

 admission: none                         admission: bounded thread pool
                                         + queue + 429 on overflow
```

Bounding memory without bounding admission just moves the failure: the pod stops
being OOM-killed and starts timing out instead. Both changes are required.

## Implementation

### JVM flags with every region capped

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service
  namespace: catalog
spec:
  template:
    spec:
      containers:
        - name: app
          image: <registry>/catalog-service:1.14.0
          env:
            - name: JAVA_TOOL_OPTIONS
              value: >-
                -XX:+UseG1GC
                -Xms960m
                -Xmx960m
                -XX:MaxMetaspaceSize=256m
                -XX:ReservedCodeCacheSize=128m
                -XX:MaxDirectMemorySize=256m
                -Xss512k
                -XX:+ExitOnOutOfMemoryError
                -XX:+HeapDumpOnOutOfMemoryError
                -XX:HeapDumpPath=/dumps
                -XX:NativeMemoryTracking=summary
          resources:
            requests: { cpu: "1", memory: 2Gi }
            limits:   { cpu: "2", memory: 2Gi }
          volumeMounts:
            - name: dumps
              mountPath: /dumps
      volumes:
        - name: dumps
          emptyDir:
            sizeLimit: 2Gi          # disk-backed, NOT medium: Memory
```

Three flags deserve comment:

- **`-Xms` == `-Xmx`.** The heap is committed up front. You would rather fail to
  schedule than discover at peak that the memory you assumed was available is
  not.
- **`-XX:+ExitOnOutOfMemoryError`.** A JVM that throws `OutOfMemoryError` and
  keeps running is in an undefined state and will usually serve errors while
  passing liveness. Exiting turns an ambiguous degradation into a clean restart.
- **`-XX:HeapDumpPath=/dumps` on a disk-backed `emptyDir`.** Writing a heap dump
  to a memory-backed volume during an OOM is self-defeating.

### Bound admission, not just memory

```yaml
# application.yaml
server:
  tomcat:
    threads:
      max: 200
      min-spare: 25
    accept-count: 100        # queue depth beyond which connections are refused
    max-connections: 1000
    connection-timeout: 5s

spring:
  task:
    execution:
      pool:
        core-size: 8
        max-size: 32
        queue-capacity: 200      # bounded — the default is Integer.MAX_VALUE
      thread-name-prefix: catalog-exec-
```

> [!WARNING]
> Spring's default `ThreadPoolTaskExecutor` queue capacity is
> `Integer.MAX_VALUE`. An "unbounded queue" is a memory leak with a scheduler
> attached: the pool never grows past core size, work piles up in the queue, and
> the queue is on the heap. Bounding it converts a slow OOM into a fast, visible
> rejection.

### Verify the budget holds under synthetic peak

```bash
#!/usr/bin/env bash
# memory-budget-check.sh — run against a canary pod under load test.
set -euo pipefail
POD="$1"; NS="${2:-catalog}"

limit=$(kubectl exec -n "$NS" "$POD" -c app -- cat /sys/fs/cgroup/memory.max)
echo "limit_bytes=$limit"

for i in $(seq 1 30); do
  cur=$(kubectl exec -n "$NS" "$POD" -c app -- cat /sys/fs/cgroup/memory.current)
  anon=$(kubectl exec -n "$NS" "$POD" -c app -- \
           awk '/^anon /{print $2}' /sys/fs/cgroup/memory.stat)
  threads=$(kubectl exec -n "$NS" "$POD" -c app -- jcmd 1 Thread.print \
              | grep -c '^"' || echo 0)
  pct=$(( 100 * cur / limit ))
  printf '%2d  current=%-12s anon=%-12s threads=%-4s  %d%% of limit\n' \
         "$i" "$cur" "$anon" "$threads" "$pct"
  [ "$pct" -gt 90 ] && echo "!! headroom exhausted at sample $i"
  sleep 10
done
```

Run this at 1.5× expected peak. If `anon` plateaus below ~85% of the limit and
thread count plateaus, the budget holds.

## Observability

```promql
# Memory headroom as a fraction — alert below 10%.
1 - (
  container_memory_working_set_bytes{container="app", namespace="catalog"}
  / on(pod, container) group_left
  kube_pod_container_resource_limits{resource="memory", container="app", namespace="catalog"}
)

# OOM kills — this should be zero, and any non-zero value is a page.
increase(kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}[1h]) > 0

# Non-heap growth: total working set minus heap. This is the metric the team
# did not have, and it is the one that would have shown the problem in week one.
container_memory_working_set_bytes{container="app"}
  - on(pod) group_left sum by (pod) (jvm_memory_used_bytes{area="heap"})

# Thread count — the leading indicator here.
jvm_threads_live_threads{app="catalog-service"}

# Direct buffer utilisation against its new ceiling.
jvm_buffer_memory_used_bytes{id="direct"} / jvm_buffer_total_capacity_bytes{id="direct"}

# Rejected work — expected to be non-zero at peak, and that is correct behaviour.
rate(tomcat_threads_busy_threads{app="catalog-service"}[5m])
```

**The single most useful panel** is working-set-minus-heap over time. It makes
non-heap growth visible directly, and it is the panel this team was missing for
three weeks.

**Alerts.** `MemoryHeadroomLow` (< 10% for 10 m) as a warning, `PodOOMKilled`
as a page. Alerting only on OOM kills means alerting only after the damage.

**Logs.** Structured log on rejection (`429`) with the queue depth at the time —
distinguishes "we are correctly shedding" from "we are broken".

## Security

- **Heap dumps contain everything in memory**: session tokens, PII, decrypted
  secrets, request bodies. Treat `/dumps` as a sensitive artefact. Do not ship
  it to a shared bucket without encryption and access control, and set a
  retention policy.
- `jcmd` and `Thread.print` expose full stack traces including argument values in
  some frames. Restrict `pods/exec` in production to a break-glass role.
- Native Memory Tracking should be enabled on canaries, not fleet-wide — it is
  diagnostic tooling with overhead, and its output aids an attacker mapping
  process internals.

## Reliability

- **QoS class.** `requests == limits` gives Guaranteed QoS, which means the pod
  is last to be evicted under node memory pressure. Keep it. Dropping to
  Burstable to increase density trades a rare OOM kill for a common eviction.
- **`-XX:+ExitOnOutOfMemoryError`** makes failure fast and unambiguous. Combined
  with a `startupProbe` and `maxUnavailable: 0`, a single bad pod does not
  degrade the fleet.
- **PodDisruptionBudget** with `minAvailable: 9` (of 12) so a node drain during
  peak cannot compound with a restart.
- **Graceful shutdown does not exist for OOM kills.** The mitigation is to make
  them not happen — which is why bounded admission matters as much as bounded
  memory.
- **Failure domain**: memory limits are per-container. Fixing one container does
  nothing for the sidecar. Audit sidecar limits at the same time; an
  under-provisioned Envoy under connection load fails the same way.

## Cost Considerations

- The naive fix — raise the limit to 4Gi — halves pod density per node. At 12
  replicas that is roughly two extra `m6i.2xlarge` nodes running continuously.
  The engineering time to build a memory budget is repaid quickly at that rate.
- Right-sizing in the other direction is also available: with a bounded budget
  the service demonstrably fits in 2Gi, and the *request* can now be trusted,
  which improves bin-packing across the whole cluster.
- Restart cost is real but usually underestimated: 40 s of warm-up × 9 restarts
  a day × 12 pods is a meaningful fraction of a pod-day spent not serving.
- Heap dump storage is a small but non-zero cost; cap it with a retention
  lifecycle rather than an unbounded bucket.

## Trade-offs

| Decision | Chosen | Alternative | Why |
|---|---|---|---|
| Heap sizing | Absolute `-Xmx` from a budget | `MaxRAMPercentage` | A percentage assumes non-heap is a fixed fraction of the limit. It is a function of concurrency, not of the limit |
| `-Xms` | Equal to `-Xmx` | Small initial heap | Fail at schedule time rather than at peak |
| OOM behaviour | `ExitOnOutOfMemoryError` | Let the JVM continue | A JVM after OOM is in an undefined state that still passes liveness |
| Admission control | Bounded pools + `429` | Unbounded queue | An unbounded queue converts overload into an OOM instead of a rejection |
| Thread stack | `-Xss512k` | Default 1 MiB | 512 KiB is ample for this call depth; halves the largest non-heap consumer |
| QoS | Guaranteed | Burstable for density | Eviction under node pressure is worse than the density cost |
| Limit | Keep at 2Gi | Raise to 4Gi | Raising the limit raises the demand too; it treats the symptom |

**What the chosen approach costs:** `429` responses at extreme peak that
previously would have been served (slowly). That is a deliberate trade — a fast
rejection the client can retry against another pod beats a 2.4 s timeout
followed by a pod death.

## Failure Scenarios

1. **Traffic grows past the bounded pool.** The service now sheds load instead of
   dying. Correct, but it needs an HPA on a saturation signal so shedding
   triggers scale-out on a saturation signal, not on CPU.
2. **A genuine leak appears later.** Bounded regions delay it, they do not
   prevent it. The working-set-minus-heap panel is what catches it.
3. **A dependency slows down.** Threads block, the pool saturates, and the
   service sheds load while nothing is technically wrong with it. Needs
   per-dependency timeouts and a circuit breaker, or you have moved the outage.
4. **Someone adds a `medium: Memory` emptyDir.** Instant, invisible reduction in
   the memory budget. Prevent with a policy check.
5. **Node-level memory pressure from a noisy neighbour.** Guaranteed QoS
   protects this pod, but Burstable pods on the same node will be evicted and
   may include something this service depends on.
6. **Sidecar OOM.** Envoy at 128Mi under high connection counts dies, and the
   pod is unreachable while the app container looks perfectly healthy.

## Runbook

**Trigger:** `PodOOMKilled` or `MemoryHeadroomLow` in `catalog`.

```text
1. Which container?
   kubectl get pod -n catalog <pod> -o jsonpath=\
     '{range .status.containerStatuses[*]}{.name}{"\t"}{.lastState.terminated.reason}{"\n"}{end}'

2. Container-scoped or node-scoped?
   kubectl get events -A --field-selector reason=SystemOOM
   → SystemOOM present  → node problem, check for noisy neighbours, cordon
   → absent             → this pod's own budget; continue

3. Which region is growing?
   kubectl exec -n catalog <pod> -c app -- cat /sys/fs/cgroup/memory.stat
   → anon high      → heap / threads / direct buffers  → step 4
   → file high      → page cache; usually benign, verify working_set not usage
   → shmem high     → a memory-medium emptyDir is consuming the budget

4. Attribute it
   kubectl exec -n catalog <pod> -c app -- jcmd 1 VM.native_memory summary
   kubectl exec -n catalog <pod> -c app -- jcmd 1 Thread.print | grep -c '^"'

5. Immediate mitigation (choose one, in preference order)
   a. Scale out — more pods, same limit. Reduces per-pod concurrency,
      which is what drives non-heap memory here.
        kubectl scale deployment catalog-service -n catalog --replicas=18
   b. Reduce admission — lower max threads via config and roll.
   c. Raise the limit ONLY as a time-boxed measure, with a ticket, and only
      if node capacity exists. Record it as debt.

6. Capture evidence for the fix
   kubectl cp catalog/<pod>:/dumps/java_pid1.hprof ./heapdump.hprof -c app

7. Verify
   Watch working-set-minus-heap for one full peak window.
```

## Prevention

| Control | Catches |
|---|---|
| Memory budget documented per service, reviewed at design time | Percentage-based heap sizing |
| `MaxMetaspaceSize`, `MaxDirectMemorySize`, `Xss`, bounded pools required by lint | Unbounded regions |
| Load test at 1.5× peak with `memory-budget-check.sh` | Concurrency-driven growth |
| Working-set-minus-heap panel on every JVM service dashboard | Non-heap growth invisible to app metrics |
| Policy check rejecting `emptyDir.medium: Memory` without an explicit exception | Silent budget reduction |
| Sidecar limits reviewed alongside app limits | Sidecar OOM masquerading as app failure |
| Alert on headroom, not on OOM | Detection after the damage |

### Policy check (Kyverno)

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-bounded-jvm-memory
spec:
  validationFailureAction: Audit
  rules:
    - name: memory-medium-emptydir-needs-annotation
      match:
        any:
          - resources: { kinds: [Pod] }
      validate:
        message: >-
          A memory-backed emptyDir counts against the container memory limit.
          Annotate with memory-budget/emptydir-reviewed=true to acknowledge.
        pattern:
          spec:
            =(volumes):
              - =(emptyDir):
                  X(medium): "!Memory"
```

## Postmortem

**Incident:** `catalog-service` recurring OOM kills — 2026-08-15 to 2026-09-05
**Severity:** SEV-3 (chronic) · **Restarts:** 137 over 21 days

### Timeline

| Date | Event |
|---|---|
| 08-15 | First OOM kills after release 1.11.0 raised default page size 20 → 50 |
| 08-16 | Memory limit raised 1Gi → 1.5Gi; restarts stop |
| 08-23 | Restarts resume at peak |
| 08-24 | Limit raised 1.5Gi → 2Gi |
| 09-01 | Restarts resume; ticket raised to investigate properly |
| 09-04 | NMT enabled on a canary; thread stacks and direct buffers identified |
| 09-05 | Memory budget applied fleet-wide; bounded admission shipped |
| 09-06 | One full peak cycle with zero OOM kills, headroom stable at 18% |

### Root cause

Non-heap memory (thread stacks + direct NIO buffers) scaled with request
concurrency and had no enforced ceiling. Heap was sized as a percentage of the
container limit, so every limit increase also increased demand.

### Contributing factors

1. Release 1.11.0 raised default page size, increasing payload size and
   therefore direct buffer usage — the change was reviewed for correctness, not
   for memory.
2. Dashboards showed heap only. Non-heap was invisible.
3. Two Spring executors had unbounded queues.
4. Raising the limit "worked" three times, which reinforced it as the fix.
5. No load test above expected peak.

### Detection

Automated but late — the OOM alert fires after the kill. Headroom alerting now
fires roughly 20 minutes earlier.

### Corrective actions

| # | Action | Owner | Due |
|---|---|---|---|
| 1 | Memory budget doc + JVM flags for all 6 JVM services | catalog | 2026-09-19 |
| 2 | Working-set-minus-heap panel added to the JVM dashboard template | platform | 2026-09-12 |
| 3 | `MemoryHeadroomLow` alert on all Guaranteed workloads | platform | 2026-09-12 |
| 4 | Bounded-queue lint rule in the Java service template | platform | 2026-09-26 |
| 5 | Peak × 1.5 load test added to the release pipeline | catalog | 2026-10-10 |
| 6 | Kyverno policy for memory-medium emptyDir | platform | 2026-09-26 |

## Interview Questions

1. A container shows exit code 137. What are the two distinct causes, and how do
   you tell them apart?
2. The JVM heap peaks at 60% of `-Xmx`, but the container is OOMKilled. Where is
   the memory going? Name four candidate regions.
3. What is the difference between `container_memory_usage_bytes` and
   `container_memory_working_set_bytes`, and which one does the kernel kill on?
4. Why is `-XX:MaxRAMPercentage=75` a risky default in Kubernetes?
5. A team fixes recurring OOM kills by raising the memory limit each time. Why
   does that keep working temporarily, and why does it keep coming back?
6. What does `medium: Memory` on an `emptyDir` do to a container's memory budget?
7. Explain the three Kubernetes QoS classes and how each behaves under node
   memory pressure.
8. Your service now returns 429 at peak instead of being OOMKilled. Is that
   better? What else must be true for it to be acceptable?
9. How would you distinguish a memory leak from unbounded-but-correct growth
   under load, using only metrics?
10. A pod has an app container and an Envoy sidecar. The pod is unreachable but
    the app looks healthy. What do you check?

## Key Takeaways

- **The cgroup kills on total anonymous memory, not on heap.** Any budget
  expressed only in `-Xmx` is incomplete.
- **Every memory region needs an enforced ceiling.** Metaspace, code cache,
  direct buffers and thread stacks all default to "generous" or "unbounded".
- **Raising the limit raises the demand** when the heap is sized as a percentage
  of the limit. That is why it always comes back.
- **Unbounded queues are memory leaks with a scheduler attached.**
- **Bounding memory without bounding admission moves the failure rather than
  fixing it.**
- **Working set minus heap** is the one panel that makes this class of problem
  visible, and almost nobody has it.
- **Alert on headroom, not on kills.** By the time the OOM alert fires the
  requests are already lost.

## Related Projects

- **[Monitoring](https://github.com/sameeralam3127/Monitoring)** — a
  Docker-based Prometheus, Grafana, Node Exporter and cAdvisor stack. cAdvisor is
  the source of the `container_memory_*` series used throughout this case study,
  and it is a good local environment for building the headroom panels described
  above.
- **[KubeRescue](https://github.com/sameeralam3127/KubeRescue)** — detects
  Kubernetes failure states such as repeated `OOMKilled` terminations and applies
  remediation under policy.

**Related case studies:**
[CrashLoopBackOff After a Release](crashloopbackoff-after-release.md)

*Planned:* HPA Not Scaling · Container Resource Limits · Memory Leak on a
Long-Running Host.
