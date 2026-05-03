# System Design 365

A structured repository for system design interview prep with a FAANG-style focus:

- High-Level Design (HLD) for architecture and scalability discussions
- Low-Level Design (LLD) for object modeling, APIs, and implementation detail
- Case studies for classic interview systems
- Reusable patterns, trade-offs, and templates for faster revision
- Security notes for runtime, supply-chain, and operational risk

## Goal

Use this repo as a long-term preparation workspace for:

- Product architecture interviews
- Backend and distributed systems interviews
- Senior engineer / staff engineer design rounds
- Revision before FAANG-style interviews

## What Goes Where

### `HLD/`

Use for large-scale system design topics:

- scalability basics
- load balancing
- caching
- databases
- CAP theorem
- sharding and partitioning
- queues and event-driven systems
- consistency and availability

Suggested files:

- `HLD/fundamentals.md`
- `HLD/scaling-basics.md`
- `HLD/database-selection.md`
- `HLD/caching-strategies.md`
- `HLD/messaging-and-queues.md`

### `LLD/`

Use for low-level design and machine coding style prep:

- object-oriented design
- class relationships
- API contracts
- concurrency basics
- extensibility and maintainability

Suggested files:

- `LLD/ood-principles.md`
- `LLD/design-patterns.md`
- `LLD/api-design.md`
- `LLD/problem-examples.md`

### `case-studies/`

Use for end-to-end system walkthroughs:

- URL shortener
- rate limiter
- chat application
- notification system
- news feed
- ride sharing
- file storage
- video streaming

Suggested files:

- `case-studies/url-shortener.md`
- `case-studies/rate-limiter.md`
- `case-studies/chat-system.md`
- `case-studies/news-feed.md`

### `patterns/`

Use for reusable design building blocks:

- cache-aside
- pub/sub
- leader election
- id generation
- fan-out
- circuit breaker
- retries and backoff

### `trade-offs/`

Use for fast interview revision:

- SQL vs NoSQL
- sync vs async
- push vs pull
- strong vs eventual consistency
- monolith vs microservices
- REST vs gRPC

### `templates/`

Use for repeatable interview answer structure:

- requirement gathering template
- back-of-the-envelope estimation template
- API template
- database schema template
- bottleneck checklist

### `notes/`

Use for quick revision, mistakes, and learnings:

- one-page summaries
- interview mistakes
- company-specific observations
- revision notes

### `diagrams/`

Use for architecture sketches, exported diagrams, and image assets.

### `mock-interviews/`

Use for realistic interview practice, reusable prompts, and post-mock feedback.

Suggested files:

- `mock-interviews/session-template.md`
- `mock-interviews/interviewer-checklist.md`
- `mock-interviews/prompt-001-url-shortener.md`
- `mock-interviews/prompt-002-notification-service.md`
- `mock-interviews/prompt-003-chat-system.md`
- `mock-interviews/prompt-004-news-feed.md`

### `security/`

Use for security-focused system design notes:

- runtime and toolchain execution surfaces
- supply-chain attack paths
- secret handling and CI/CD hardening
- secure defaults and operational guardrails

Suggested files:

- `security/python-before-your-code-runs.md`

## 12-Week Roadmap

### Week 1: Foundations

- system design interview expectations
- functional vs non-functional requirements
- latency, throughput, availability, reliability
- estimation basics

### Week 2: Core Building Blocks

- load balancers
- reverse proxies
- caching basics
- CDNs
- databases overview

### Week 3: Data Layer Deep Dive

- SQL vs NoSQL
- indexing
- replication
- partitioning
- consistency models

### Week 4: Scalability Patterns

- horizontal scaling
- stateless services
- queues
- pub/sub
- rate limiting

### Week 5: Reliability and Resilience

- retries
- timeouts
- circuit breakers
- failover
- observability basics

### Week 6: API and LLD Focus

- REST and gRPC basics
- API versioning
- object modeling
- SOLID principles
- common LLD interview questions

### Week 7: Case Study 1

- design a URL shortener
- design a rate limiter
- design a pastebin

### Week 8: Case Study 2

- design a chat system
- design a notification service
- design a news feed

### Week 9: Case Study 3

- design Dropbox / file storage
- design YouTube / video processing
- design Uber / ride matching

### Week 10: Advanced Topics

- multi-region systems
- leader election
- distributed locks
- id generation
- stream processing

### Week 11: Interview Simulation

- timed design rounds
- structured whiteboarding
- trade-off communication
- bottleneck analysis

### Week 12: Revision and Weak Areas

- revisit weak topics
- summarize core patterns
- redo 3 to 5 case studies without notes
- create personal cheat sheets

## FAANG-Style Interview Prep Flow

For each problem, practice this order:

1. Clarify requirements
2. Estimate scale
3. Define APIs and data model
4. Draw high-level components
5. Deep dive into bottlenecks
6. Discuss trade-offs
7. Mention scaling and reliability improvements

## Suggested First Files To Create Next

- `HLD/fundamentals.md`
- `HLD/caching-strategies.md`
- `LLD/ood-principles.md`
- `case-studies/url-shortener.md`
- `trade-offs/sql-vs-nosql.md`
- `templates/interview-template.md`

## Daily Study Pattern

- 30 minutes: one concept
- 30 minutes: one case study section
- 15 minutes: revise trade-offs
- 15 minutes: summarize notes in your own words

## Progress Tracker

- [ ] HLD fundamentals
- [ ] database design basics
- [ ] caching and queues
- [ ] consistency and partitioning
- [ ] 5 core case studies
- [ ] 5 mock interviews
- [ ] one-page revision sheet
