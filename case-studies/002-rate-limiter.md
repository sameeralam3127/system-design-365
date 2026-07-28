# Rate Limiter

# Case Study: Designing a Rate Limiter

## 1. Problem Statement

A rapidly growing API platform is experiencing outages caused by traffic spikes — both legitimate (a client's retry storm during a downstream failure) and malicious (scraping, credential-stuffing attempts). The platform needs a **rate limiter**: a system that throttles the number of requests a client can make in a given time window, protecting backend services while staying fair to well-behaved clients.

This case study walks through requirements gathering, algorithm selection, architecture, and the trade-offs involved in building one for a multi-region API gateway.

## 2. Requirements

### Functional

- Limit requests per client (identified by API key, user ID, or IP) to N requests per time window.
- Support different limits per tier (e.g., free: 100 req/min, enterprise: 10,000 req/min).
- Return a clear signal to rejected clients (HTTP 429, `Retry-After` header).
- Allow limits to be updated without a redeploy.

### Non-Functional

- **Low latency**: the limiter sits on the hot path of every request; it must add single-digit milliseconds at most.
- **High availability**: the limiter must not become a bigger single point of failure than the system it protects. A rate limiter that goes down and blocks all traffic is worse than no rate limiter.
- **Accuracy vs. cost trade-off**: perfectly precise counting across a distributed fleet is expensive; the design should be able to tolerate small overcounts in exchange for speed.
- **Horizontal scalability**: the gateway runs across many nodes and regions; the limiter must work correctly when requests for the same client land on different nodes.

## 3. Algorithm Choices

There are five classic approaches. Each makes a different trade-off between memory use, burst tolerance, and precision.

### 3.1 Fixed Window Counter

Divide time into fixed windows (e.g., 00:00–00:01) and count requests per window. Simple and memory-efficient, but it allows up to 2x the limit at window boundaries — a client can burst at the end of one window and the start of the next.

### 3.2 Sliding Window Log

Store a timestamp for every request and count how many fall within the trailing window. Perfectly accurate, but memory grows linearly with request volume, making it expensive at scale.

### 3.3 Sliding Window Counter

A hybrid: keep counters for the current and previous fixed windows, and weight the previous window's count by how much it overlaps the trailing window. Approximates the sliding log with a fraction of the memory, at the cost of slight inaccuracy under non-uniform traffic.

### 3.4 Token Bucket

Each client has a bucket that refills at a fixed rate up to a capacity. Each request consumes a token; if the bucket is empty, the request is rejected. This naturally allows short bursts (up to the bucket capacity) while enforcing a long-term average rate — a good fit for APIs where occasional bursts are expected.

### 3.5 Leaky Bucket

Requests enter a queue (the "bucket") and are processed at a fixed rate; if the queue is full, new requests are dropped. This smooths bursts into a steady outflow, which is useful for protecting downstream systems that can't handle spiky load, but adds queueing latency.

### Decision

For this platform, **token bucket** was chosen: it tolerates legitimate bursts (important for batch-style API clients), is O(1) in memory per client, and is simple to reason about. The leaky bucket's queueing behavior wasn't needed since downstream services already have their own buffering.

## 4. Architecture

### 4.1 Where the limiter lives

Rate limiting logic sits in the API gateway, before requests reach backend services, so rejected requests never consume backend capacity.

### 4.2 Distributed state

Since the gateway runs on many nodes, per-client counters can't live in local process memory — a client's requests may hit a different node each time. Two options were considered:

- **Centralized store (Redis)**: all nodes read/write token counts to a shared Redis cluster using atomic operations (`INCR`, Lua scripts for the token-bucket refill logic). Simple to reason about; consistent view of each client's usage across nodes.
- **Local approximate counting with periodic sync**: each node keeps a local counter and periodically syncs with peers. Lower latency, higher throughput, but allows more slack in enforcement (a client could exceed the limit by a multiple of the number of nodes before the sync catches up).

The platform chose **Redis-backed token buckets**, with the atomic refill-and-consume logic implemented as a single Lua script to avoid race conditions between the "check" and "decrement" steps. Redis's in-memory speed keeps added latency to roughly 1–2 ms, and Redis Cluster provides horizontal scaling and replication for availability.

### 4.3 Failure handling

If Redis becomes unavailable, the gateway **fails open** (allows traffic through) rather than fails closed (blocks everything). A rate limiter's job is to protect the system from overload, not to become the outage itself — an unreachable rate-limiting store should degrade to "no limiting" with an alert firing, not a global 429 storm.

### 4.4 Multi-region considerations

For a multi-region deployment, a single global Redis cluster would add cross-region latency to every request. Instead, each region runs its own Redis cluster with a regional slice of the client's limit (e.g., a 1,000 req/min global limit becomes roughly 250 req/min in each of four regions). This trades some precision — a client could theoretically get more aggregate throughput by spreading requests across regions — for the low latency that comes from keeping state local.

## 5. API Contract

- Rejected requests return `429 Too Many Requests` with a `Retry-After` header indicating when to retry.
- Every response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers so well-behaved clients can self-throttle before hitting the limit.

## 6. Trade-offs Summary

| Decision                       | Benefit                                  | Cost                                           |
| ------------------------------ | ---------------------------------------- | ---------------------------------------------- |
| Token bucket over leaky bucket | Tolerates legitimate bursts              | Less smoothing of downstream load              |
| Redis-backed shared state      | Accurate, consistent limits across nodes | Adds a network hop; Redis becomes a dependency |
| Fail open on store failure     | Availability protected                   | Limiter offers no protection during an outage  |
| Regional Redis slices          | Low latency, no cross-region hop         | Global limit enforcement is approximate        |

## 7. Monitoring & Iteration

Key metrics tracked post-launch: rejection rate by client tier, Redis latency (p50/p99), and fail-open incidents. These surfaced that a small number of enterprise clients were regularly bursting to their cap, prompting a follow-up conversation about raising their bucket capacity rather than their sustained rate — a case where the algorithm's burst/sustained-rate split (token bucket's core feature) let the team tune one dimension without touching the other.

## 8. Key Takeaways

- Algorithm choice should match traffic shape: bursty legitimate clients favor token bucket; systems needing strict output smoothing favor leaky bucket.
- Distributed rate limiting always trades off precision, latency, and availability — there's no configuration that maximizes all three simultaneously.
- A rate limiter must be designed to fail safely; a limiter that becomes a new single point of failure defeats its own purpose.
