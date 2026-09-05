---
title: Mock Interview: Notification Service
description: A timed prompt for designing a multi-channel notification service.
tags: [interview, prompt, notifications]
author: Sameer Alam
created: 2026-08-01
updated: 2026-09-06
status: published
---

# Mock Interview Prompt 002: Notification Service

## Prompt

Design a notification service that can send email, SMS, and push notifications.

## Interviewer Notes

Listen for whether the candidate separates:

- notification creation
- user preferences
- template rendering
- provider dispatch
- retries and failure handling

## Optional Follow-Ups

- User-level notification preferences
- Rate limiting per user and per channel
- Scheduled notifications
- Delivery status tracking
- Provider failover

## What Strong Answers Usually Cover

- asynchronous architecture with queues
- multi-channel abstraction
- retry and dead-letter handling
- idempotency
- provider integration boundaries
- observability and delivery metrics
