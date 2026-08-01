# Mock Interview Prompt 001: URL Shortener

## Prompt

Design a URL shortening service similar to Bitly.

## Interviewer Notes

If the candidate gets stuck, guide them toward:

- short code generation
- redirect-heavy traffic patterns
- caching hot URLs
- database sharding
- analytics as a secondary pipeline

## Optional Follow-Ups

- Support custom aliases
- Add expiration time for links
- Prevent abuse and malicious URLs
- Track click analytics by region and device
- Design for global low-latency redirects

## What Strong Answers Usually Cover

- requirement clarification
- read-heavy workload
- unique ID generation and Base62 encoding
- cache-first redirect path
- storage schema for `short_code -> long_url`
- trade-off between relational and NoSQL storage
- 301 vs 302 redirect discussion
