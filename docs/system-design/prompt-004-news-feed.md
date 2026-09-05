---
title: Mock Interview: News Feed
description: A timed prompt for designing a news feed, including the push-vs-pull fan-out decision.
tags: [interview, prompt, news-feed, fan-out]
author: Sameer Alam
created: 2026-08-01
updated: 2026-09-06
status: published
---

# Mock Interview Prompt 004: News Feed

## Prompt

Design a social media news feed similar to Facebook or Instagram home feed.

## Interviewer Notes

Candidates should explore:

- fan-out on write vs fan-out on read
- ranking vs chronological feed
- follower graph scale
- celebrity problem
- cache invalidation and freshness

## Optional Follow-Ups

- Support stories or ephemeral posts
- Personalized ranking
- Ad insertion
- Multi-region feed serving
- Feed generation under celebrity load

## What Strong Answers Usually Cover

- post creation pipeline
- social graph considerations
- feed generation strategy
- cache design and invalidation
- hot user handling
- trade-offs between latency, freshness, and cost
