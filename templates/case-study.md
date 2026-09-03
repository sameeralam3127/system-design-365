---
title: {{title}}
description: One-line summary shown in cards, search, and SEO meta.
tags: [distributed-systems]
difficulty: medium
author: Sameer Alam
created: {{date}}
updated: {{date}}
status: draft
---

## Problem Statement

What are we building and why is it interesting at scale?

## Requirements

### Functional requirements

- …

### Non-functional requirements

- …

### Constraints & assumptions

- …

## Capacity Estimation

Back-of-the-envelope: traffic, storage, bandwidth, memory.

## High-Level Design

```mermaid
flowchart LR
  Client --> LB[Load Balancer] --> App[App Servers]
  App --> Cache[(Cache)]
  App --> DB[(Database)]
```

## API Design

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/...` | POST | … |

## Database Design

Schema, indexes, partitioning strategy.

## Deep Dives

### Scaling strategy

### Bottlenecks

### Trade-offs

> [!NOTE]
> Call out the key interview talking points here.

## Monitoring & Security

## Final Architecture

```mermaid
flowchart TB
  subgraph Edge
    CDN --> LB[Load Balancer]
  end
  LB --> Service
```

## References

- …

## Lessons Learned

- …
