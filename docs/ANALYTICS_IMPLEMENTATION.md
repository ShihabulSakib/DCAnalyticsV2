# DCAnalyticsV2 - Advanced Analytics & Activity Logging System

> **Implementation Date:** February 2026  
> **Version:** 2.0

## Overview

This document describes the new activity logging and advanced analytics features for the DCAnalyticsV2 platform. The system tracks user interactions, provides a comprehensive admin "spy view", and enables exam/student management through a modern tab-based dashboard.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ ResultModal   │  │ useActivityLogger │  │ AdminDashboard  │  │
│  │ (Telemetry)   │──│      Hook         │  │   (Tab-Based)   │  │
│  └───────────────┘  └──────────────────┘  └─────────────────┘  │
│           │                   │                    │            │
│           └───────────────────┼────────────────────┘            │
│                               │                                  │
│                        ┌──────▼──────┐                          │
│                        │   api.js    │                          │
│                        └──────┬──────┘                          │
└───────────────────────────────┼─────────────────────────────────┘
                                │ HTTP/REST
┌───────────────────────────────▼─────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      api/index.py                           │ │
│  │  POST /api/log-activity                                     │ │
│  │  GET  /api/admin/logs                                       │ │
│  │  PUT  /api/admin/exams/{exam_id}                            │ │
│  │  GET  /api/admin/students/filtered                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      DATABASE (Neon PostgreSQL)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ access_logs (ENHANCED)                                    │   │
│  │   - actor_roll, target_roll, action_type, metadata        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `access_logs` Table (Enhanced)

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `timestamp` | TIMESTAMP | Auto-generated creation time |
| `roll` | VARCHAR | Legacy: student roll (kept for backward compat) |
| `actor_roll` | VARCHAR(50) | **NEW**: User performing the action |
| `target_roll` | VARCHAR(50) | **NEW**: Student being viewed/compared |
| `action_type` | VARCHAR(50) | **NEW**: Enum of action types |
| `metadata` | TEXT | **NEW**: JSON with additional context |
| `ip_address` | VARCHAR | Client IP address |
| `status` | VARCHAR | Success/Failed status |
| `accessor_roll` | VARCHAR | Legacy column (kept for compat) |

### Action Types

| Action | Description |
|--------|-------------|
| `LOGIN` | User logged into the system |
| `VIEW_RESULT` | User opened a student's result modal |
| `COMPARE_RESULT` | User compared results with another student |
| `UPDATE_EXAM` | Admin updated an exam name |

### Migration Script

```sql
-- Run this against your Neon PostgreSQL database
ALTER TABLE access_logs 
  ADD COLUMN IF NOT EXISTS actor_roll VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_roll VARCHAR(50),
  ADD COLUMN IF NOT EXISTS action_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_action_type ON access_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_actor_roll ON access_logs(actor_roll);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp DESC);
```

---

## API Endpoints

### 1. Log Activity

**Endpoint:** `POST /api/log-activity`

**Authentication:** Any logged-in user (via `X-User-Roll` header)

**Request Body:**
```json
{
  "action": "VIEW_RESULT",
  "target_roll": "120211010002",
  "metadata": {
    "exam_id": "HSC_2024_MID",
    "student_name": "John Doe"
  }
}
```

**Response:**
```json
{ "success": true }
```

**Notes:**
- Silently fails if no roll header provided (won't disrupt UX)
- Rate limiting may be added in future versions

---

### 2. Get Activity Logs (Admin)

**Endpoint:** `GET /api/admin/logs`

**Authentication:** Admin JWT Bearer Token

**Query Parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number (1-indexed) |
| `page_size` | 50 | Items per page (10-100) |
| `action_filter` | null | Filter by action type |

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2026-02-01T16:30:00Z",
      "action_type": "VIEW_RESULT",
      "actor_roll": "120211010001",
      "actor_name": "John Student",
      "actor_image": "/api/student-image/120211010001",
      "target_roll": "120211010002",
      "target_name": "Jane Student",
      "target_image": "/api/student-image/120211010002",
      "metadata": "{\"exam_id\": \"HSC_2024_MID\"}"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total": 1234,
    "total_pages": 25
  }
}
```

---

### 3. Update Exam Name (Admin)

**Endpoint:** `PUT /api/admin/exams/{exam_id}`

**Authentication:** Admin JWT Bearer Token

**Request Body:**
```json
{ "name": "HSC Mid-Term Examination 2024" }
```

**Response:**
```json
{ "success": true, "exam_id": 5 }
```

**Note:** In future versions, `exam_id_text` may become the primary key. Current implementation uses integer `id`.

---

### 4. Get Filtered Students (Admin)

**Endpoint:** `GET /api/admin/students/filtered`

**Authentication:** Admin JWT Bearer Token

**Query Parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `session` | null | Filter by session (e.g., "2021-2023") |
| `group` | null | Filter by group (Science/Business Studies/Humanities) |
| `section` | null | Filter by section (A-F) |

**Response:** Array of student objects

---

## Frontend Components

### New Files Created

```
src/
├── hooks/
│   └── useActivityLogger.js      # Telemetry hook
├── components/
│   └── admin/
│       ├── AccessLogTable.jsx    # Spy view with pagination
│       ├── ExamManager.jsx       # Exam editing interface
│       └── StudentManager.jsx    # Filtered student grid
```

### Admin Dashboard Tabs

| Tab | Component | Features |
|-----|-----------|----------|
| Overview | Built-in | Stats cards (students, exams count) |
| Access Logs | `AccessLogTable` | Paginated table, avatars, action badges, click for details |
| Exam Manager | `ExamManager` | Cascading filters, inline name editing |
| Student Manager | `StudentManager` | Advanced filters, responsive grid |

### Activity Tracking Integration

The `useActivityLogger` hook is integrated into:

1. **ResultModal** - Logs `VIEW_RESULT` when a student's result is opened
2. **CompareView** (future) - Logs `COMPARE_RESULT` when comparison is made

---

## Verification Guide

### 1. Database Migration

Run the migration against your database:

```bash
psql $DATABASE_URL -f api/schema_migration.sql
```

Verify columns were added:

```bash
psql $DATABASE_URL -c "\\d access_logs"
```

Expected: Should show `actor_roll`, `target_roll`, `action_type`, `metadata` columns.

---

### 2. Backend API Testing

**Start the server:**
```bash
cd ~/Desktop/Github/DCAnalyticsV2
source venv/bin/activate
uvicorn api.index:app --reload --port 8000
```

**Test activity logging:**
```bash
curl -X POST http://localhost:8000/api/log-activity \
  -H "Content-Type: application/json" \
  -H "X-User-Roll: 120211010001" \
  -d '{"action": "VIEW_RESULT", "target_roll": "120211010002"}'
```
Expected: `{"success": true}`

**Test admin logs:**
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "YOUR_PASSWORD"}' | jq -r '.access_token')

# Fetch logs
curl "http://localhost:8000/api/admin/logs?page=1" \
  -H "Authorization: Bearer $TOKEN"
```
Expected: JSON with `logs` array and `pagination` object.

---

### 3. Frontend Testing

**Start dev server:**
```bash
npm run dev
```

**Manual test checklist:**

- [ ] Login as a student with a valid roll
- [ ] Click on any student in the merit list to open ResultModal
- [ ] Check Network tab → should see POST to `/api/log-activity`
- [ ] Login as admin
- [ ] Navigate to Admin Dashboard
- [ ] Click each tab (Overview, Access Logs, Exam Manager, Student Manager)
- [ ] On Access Logs tab:
  - [ ] Verify table shows actor names and avatars
  - [ ] Verify action badges are color-coded
  - [ ] Test pagination (Next/Previous buttons)
  - [ ] Click a row to see detailed activity card
- [ ] On Exam Manager tab:
  - [ ] Select session from dropdown
  - [ ] Select group from dropdown
  - [ ] Verify exams appear in table
  - [ ] Click "Edit" on an exam, change name, verify it saves
- [ ] On Student Manager tab:
  - [ ] Test all three filters (Session, Group, Section)
  - [ ] Verify student grid updates correctly
- [ ] Toggle dark mode → verify all components look correct

---

### 4. Security Verification

**Unauthenticated access should fail:**
```bash
curl http://localhost:8000/api/admin/logs
# Expected: 401 Unauthorized

curl http://localhost:8000/api/admin/logs \
  -H "Authorization: Bearer invalid_token"
# Expected: 401 Unauthorized
```

---

## Configuration Notes

### Environment Variables

No new environment variables required. Uses existing:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `SECRET_KEY` - JWT signing key
- `ADMIN_PASSWORD` - Admin login password

### Dependencies

No new npm packages needed. Uses existing:
- `framer-motion` - Tab animations
- `lucide-react` - Icons
- `axios` - API calls

---

## Known Limitations

1. **Activity logging is best-effort** - Logs silently fail if backend unavailable
2. **Section filtering is client-side** - Based on roll number parsing
3. **Exam ID transition** - Currently uses integer `id`, future migration to `exam_id_text` as primary key pending

---

## Future Enhancements

- [ ] Real-time activity stream via WebSocket
- [ ] Export logs to CSV/Excel
- [ ] Activity analytics dashboard (charts/graphs)
- [ ] Compare result tracking integration
- [ ] Rate limiting on activity logging endpoint
