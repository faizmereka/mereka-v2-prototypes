---
title: Messaging Non-Functional Requirements
type: feature_spec
status: draft
owner: engineering
vehicle: marketplace_platform
version: 1.0.0
last_updated: '2026-02-17'
depends_on: []
links:
  related_specs:
  - specs/messaging/messaging-overview_spec.md
related_specs:
- specs/cross-cutting-requirements_spec.md
---
# Human Summary

## What this covers

Non-functional requirements that apply across ALL messaging specs:
- Performance (latency, throughput)
- Security (access control, data protection)
- Observability (metrics, logging, alerts)
- Scalability (concurrent connections, data growth)
- Reliability (error handling, data retention)

## Why

NFRs ensure the system is production-ready, not just functionally correct.

---

# Agent Contract

## Scope

This spec covers the implementation requirements defined in the Acceptance Criteria below.

## Non-goals

- Features not listed in Acceptance Criteria
- Implementation details beyond specified requirements

## Requirements

System MUST implement all acceptance criteria defined below.


## Acceptance Criteria

### Performance

- [ ] AC-NFR-001: Message delivery latency MUST be < 500ms for 95th percentile
- [ ] AC-NFR-002: Message history API MUST respond within 200ms for rooms with < 10,000 messages
- [ ] AC-NFR-003: Inbox API MUST respond within 300ms for hubs with < 1,000 rooms
- [ ] AC-NFR-004: Search API MUST respond within 500ms for queries
- [ ] AC-NFR-005: System MUST handle 100 messages/second per room sustained load

### Scalability

- [ ] AC-NFR-010: System MUST support 1,000 concurrent WebSocket connections per server instance
- [ ] AC-NFR-011: System MUST support 10,000 total concurrent connections across cluster
- [ ] AC-NFR-012: System MUST scale horizontally with Redis adapter for Socket.IO
- [ ] AC-NFR-013: Database MUST handle 1 million messages per month growth
- [ ] AC-NFR-014: Indexes MUST be optimized for common query patterns

### Security

- [ ] AC-NFR-020: All API endpoints MUST require authentication (Firebase token)
- [ ] AC-NFR-021: Users MUST only access rooms they are participants of
- [ ] AC-NFR-022: Hub members MUST only access rooms for their hub
- [ ] AC-NFR-023: Message content MUST be sanitized to prevent XSS
- [ ] AC-NFR-024: File uploads MUST be scanned for malware
- [ ] AC-NFR-025: Rate limiting MUST prevent abuse (10 msg/sec per user)
- [ ] AC-NFR-026: WebSocket connections MUST authenticate on handshake
- [ ] AC-NFR-027: Sensitive data (email) MUST NOT be exposed to unauthorized users

### Data Retention

- [ ] AC-NFR-030: Messages MUST be retained for 7 years for compliance
- [ ] AC-NFR-031: Deleted messages MUST be soft-deleted (audit trail)
- [ ] AC-NFR-032: User data deletion (GDPR) MUST anonymize messages, not delete
- [ ] AC-NFR-033: File attachments MUST be retained as long as messages

### Reliability

- [ ] AC-NFR-040: System MUST handle WebSocket disconnection gracefully
- [ ] AC-NFR-041: If WebSocket fails, system SHOULD fall back to polling
- [ ] AC-NFR-042: Database write failures MUST be retried with exponential backoff
- [ ] AC-NFR-043: System MUST queue messages during brief outages
- [ ] AC-NFR-044: System MUST have 99.9% uptime SLA

### Observability

- [ ] AC-NFR-050: System MUST emit metrics: `chat_messages_sent_total`, `chat_rooms_created_total`
- [ ] AC-NFR-051: System MUST emit metrics: `chat_websocket_connections_active` (gauge)
- [ ] AC-NFR-052: System MUST emit metrics: `chat_message_delivery_latency_ms` (histogram)
- [ ] AC-NFR-053: System MUST log: room creation, message failures, WebSocket errors
- [ ] AC-NFR-054: System MUST have Grafana dashboard for chat metrics
- [ ] AC-NFR-055: Alert MUST fire if message latency > 1s for 5 minutes
- [ ] AC-NFR-056: Alert MUST fire if WebSocket error rate > 5% for 5 minutes
- [ ] AC-NFR-057: Alert MUST fire if undelivered message queue > 1000

### Error Handling

- [ ] AC-NFR-060: API errors MUST return standard format: `{ success: false, error: { code, message } }`
- [ ] AC-NFR-061: Error codes MUST be documented and consistent
- [ ] AC-NFR-062: Client-facing errors MUST NOT expose internal details
- [ ] AC-NFR-063: All errors MUST be logged with correlation ID

---



### Non-Functional Requirements

(To be defined)
## Metrics Specification

### Counters

| Metric | Labels | Description |
|--------|--------|-------------|
| `chat_messages_sent_total` | `type`, `context_type` | Total messages sent |
| `chat_rooms_created_total` | `context_type`, `initiated_by` | Total rooms created |
| `chat_websocket_errors_total` | `error_type` | WebSocket errors |

### Gauges

| Metric | Labels | Description |
|--------|--------|-------------|
| `chat_websocket_connections_active` | `server_instance` | Active connections |
| `chat_rooms_active_total` | - | Total active rooms |

### Histograms

| Metric | Labels | Buckets | Description |
|--------|--------|---------|-------------|
| `chat_message_delivery_latency_ms` | - | 50, 100, 200, 500, 1000 | Message delivery time |
| `chat_api_response_time_ms` | `endpoint` | 50, 100, 200, 500, 1000 | API response time |

---

## Alert Definitions

```yaml
# alerts/chat-alerts.yaml

groups:
  - name: chat
    rules:
      - alert: ChatMessageLatencyHigh
        expr: histogram_quantile(0.95, chat_message_delivery_latency_ms) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Chat message delivery latency is high

      - alert: ChatWebSocketErrorRateHigh
        expr: rate(chat_websocket_errors_total[5m]) / rate(chat_websocket_connections_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: WebSocket error rate exceeds 5%

      - alert: ChatConnectionsHigh
        expr: chat_websocket_connections_active > 900
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Approaching WebSocket connection limit
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CHAT_RATE_LIMIT_PER_SECOND` | No | 10 | Messages per second per user |
| `CHAT_MESSAGE_MAX_LENGTH` | No | 10000 | Max message characters |
| `CHAT_FILE_MAX_SIZE_MB` | No | 10 | Max file upload size |
| `CHAT_WEBSOCKET_TIMEOUT_MS` | No | 60000 | WebSocket timeout |
| `CHAT_REDIS_URL` | Yes | - | Redis URL for Socket.IO adapter |
| `CHAT_ENABLED` | No | true | Feature flag to disable chat |

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `CHAT_ENABLED` | true | Enable/disable entire chat system |
| `CHAT_WEBSOCKET_ENABLED` | true | Enable/disable WebSocket (fallback to REST) |
| `CHAT_FILE_UPLOAD_ENABLED` | true | Enable/disable file uploads |
| `CHAT_SEARCH_ENABLED` | true | Enable/disable search |

---

## Rollback Plan

1. **Disable WebSocket**: Set `CHAT_WEBSOCKET_ENABLED=false`, clients fall back to polling
2. **Disable Chat**: Set `CHAT_ENABLED=false`, all chat routes return 503
3. **Database**: Collections are additive, no rollback needed
4. **Fallback UI**: Show "Contact us" form if chat is disabled

---

## Edge Cases

- See individual AC items for edge case handling

## Observability

- Standard logging for errors and key operations
- Metrics collection per NFR requirements

## Rollout & Rollback

- Feature flag controlled rollout
- Database migrations are backwards compatible

## Open Questions

- None at this time
