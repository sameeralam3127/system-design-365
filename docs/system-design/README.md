# System Design

Distributed systems designed end to end — requirements, capacity estimation,
API and data model, architecture, deep dive on the bottleneck, and the
trade-offs that only show up on the second pass.

This section predates the repository's shift toward DevOps and SRE case studies,
and it is kept because the two disciplines meet constantly in practice. The
design decisions here are the ones that determine how a system behaves when it
is operated: whether a redirect can be revoked, whether a fan-out is push or
pull, whether a rate limiter degrades open or closed. Those choices become
somebody's incident later.

## Case studies

| # | System | Difficulty |
|---|---|---|
| 001 | [URL Shortener](001-url-shortener.md) | Easy |
| 002 | [Rate Limiter](002-rate-limiter.md) | Medium |
| 003 | [Pastebin](003-pastebin.md) | Easy |
| 004 | [Chat System](004-chat-system.md) | Hard |
| 005 | [Notification Service](005-notification-service.md) | Medium |

Also here: [Twitter system design](twitter-system-design.html), a standalone
interactive page.

## Mock interviews

- [Session template](session-template.md) — for recording one mock round
- [Interviewer checklist](interviewer-checklist.md) — for scoring consistently
- Prompts: [URL Shortener](prompt-001-url-shortener.md) ·
  [Notification Service](prompt-002-notification-service.md) ·
  [Chat System](prompt-003-chat-system.md) ·
  [News Feed](prompt-004-news-feed.md)

## Method

The same seven steps every time, because the structure is the part that
transfers to a real round:

1. Clarify requirements — functional, non-functional, and explicitly out of scope
2. Estimate scale — traffic, storage, bandwidth
3. Define the API and data model
4. Draw the high-level architecture
5. Deep dive on the bottleneck
6. Talk through the trade-offs, including the option rejected and why
7. Note what you would improve with more time
