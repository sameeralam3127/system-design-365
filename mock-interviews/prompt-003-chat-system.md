# Mock Interview Prompt 003: Chat System

## Prompt

Design a one-to-one and group chat system similar to WhatsApp or Slack messaging.

## Interviewer Notes

Good candidates usually clarify:

- online vs offline delivery
- one-to-one vs group chat scope
- message ordering requirements
- read receipts and typing indicators
- attachment handling

## Optional Follow-Ups

- Multi-device sync
- Message search
- End-to-end encryption
- Presence service
- Push notifications for offline users

## What Strong Answers Usually Cover

- websocket or long-lived connection model
- message fan-out strategy
- message storage model
- ordering and delivery semantics
- unread counts and sync strategy
- handling large groups efficiently
