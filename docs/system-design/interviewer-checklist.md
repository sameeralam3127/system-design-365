---
title: Interviewer Checklist
description: Scoring a system design round consistently — requirements, estimation, architecture, trade-offs, communication.
tags: [interview, checklist, system-design]
author: Sameer Alam
created: 2026-08-01
updated: 2026-09-06
status: published
---

# Interviewer Checklist

Use this during a mock interview to keep feedback concrete and consistent.

## Before The Candidate Starts Designing

- Did the candidate ask clarifying questions?
- Did the candidate separate must-haves from optional features?
- Did the candidate confirm scale and constraints?

## During The Design

- Did the candidate present a clear high-level architecture?
- Did they define APIs and data model where relevant?
- Did they justify database and cache choices?
- Did they reason about read path and write path separately?
- Did they identify scaling bottlenecks?
- Did they address reliability and failure handling?
- Did they discuss consistency where it mattered?

## Communication Quality

- Was the explanation structured?
- Did they summarize often?
- Did they handle hints well?
- Did they communicate trade-offs instead of only naming technologies?

## Red Flags

- Jumped into implementation without clarifying requirements
- No estimation or obviously unrealistic scale assumptions
- Buzzword-heavy answers without system reasoning
- Ignored failure scenarios
- Ignored hot keys, skew, partitions, or cache behavior
- Could not explain why a component was needed

## Strong Signals

- Structured thinking
- Good prioritization of scope
- Clear trade-off analysis
- Sensible assumptions under ambiguity
- Practical scaling decisions
- Calm, collaborative communication

## Feedback Format

- 1 strength:
- 1 biggest gap:
- 1 thing to improve next:
