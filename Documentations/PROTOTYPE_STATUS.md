# ARGUS Prototype Status & Honest Verification Record

## 1. Executive Summary

ARGUS is an AICTE Approval & Compliance Intelligence Platform built for the Smart India Hackathon (SIH26262). The platform has progressed from an initial static HTML concept into a modern, production-structured full-stack application comprising:
1. **Frontend SPA**: React 18 + Vite + TypeScript + Vanilla CSS Design System with dark forest aesthetics, glassmorphic HUD controls, role-switching bar, and live API connectivity indicator.
2. **Backend API**: Python FastAPI + SQLAlchemy 2.0 + SQLite (development fallback) / PostgreSQL 16 (production container) + Native Bcrypt + UTC JWT Authentication.
3. **Regulatory Rules Engine**: Idempotent statutory deadline and escalation engine enforcing rules `WF-01`, `WF-02`, `DL-01`, `DL-02`, `EVC-01`, `EVC-02`, `CMP-01`, and `DOC-01`.
4. **Non-Repudiation Audit Trail**: Transactionally correlated regulatory event stream stamped with unique correlation tokens (`COR-XXXX`).

---

## 2. Implemented & Verified Capabilities

### Frontend SPA (`frontend/`)
- **Control Room & Overview HUD**: Real-time KPI cards, urgent applications queue, live statutory audit stream, and rapid triage preview.
- **Applications Registry & Case Progression Strip**: Stage progression along 4 statutory AICTE approval routes (`Scrutiny only`, `Scrutiny + EVC`, `EVC + SAC/SHC`, `Only EVC`).
- **Deficiency Return & Resumption Loop**: Formal deficiency returns requiring an explicit statutory reason, recording previous stage in `resume_stage`, and restoring review upon institution resubmission.
- **EVC Desk**: Committee visit scheduling with panel assignment and visit report filing with outcome determination.
- **Compliance Obligations**: Dual-role separation of duties — institution submission marks evidence as `Pending Verification`; submitting roles are strictly forbidden from self-approving.
- **Document Register**: Institutional document validity tracking, renewal filing, and scrutiny verification.
- **Alert Triage Queue**: Overdue and upcoming deadline escalations with role-scoped acknowledgment and resolution notes.
- **Automation Rules Console**: Editable threshold parameters (`reminder_days`, `expiry_days`, `escalation_role`), simulation clock override, and manual cycle execution.
- **Zero-Downtime Resilience**: Automatic proxy integration with FastAPI backend on `http://localhost:8000/api/v1` with seamless fallback to in-memory synthetic state if the backend is offline.

### Backend REST API (`backend/`)
- **Authentication & RBAC (`/api/v1/auth`)**: JWT Bearer token authentication, native `bcrypt` password hashing, and role validation across 6 distinct demo personas.
- **Workflow Endpoints (`/api/v1/applications`)**: RESTful case management, stage transitions, deficiency returns, and final competent authority determinations.
- **EVC Desk Endpoints (`/api/v1/evc`)**: Task queue retrieval, visit scheduling, and panel outcome reporting.
- **Compliance & Document Endpoints (`/api/v1/compliance`, `/api/v1/documents`)**: Evidence upload tracking and officer verification.
- **Rules Engine & Alerts (`/api/v1/rules`, `/api/v1/alerts`)**: Idempotent cycle evaluation (`POST /api/v1/rules/evaluate`), threshold configuration, and alert triage.
- **Audit Streaming (`/api/v1/audit`)**: Regulatory log streaming with event correlation IDs.

---

## 3. Automated Test Verification Record

### Backend Test Suite (Pytest)
```
platform darwin -- Python 3.14.3, pytest-9.1.1
rootdir: /Users/arijeetsingh/ARGUS/backend

tests/test_auth.py .......                                               [ 29%]
tests/test_health.py ..                                                  [ 37%]
tests/test_migrations.py .                                               [ 41%]
tests/test_rules_engine.py ......                                        [ 66%]
tests/test_worker.py ..                                                  [ 75%]
tests/test_workflow.py ......                                            [100%]

============================== 24 passed in 8.36s ==============================
```
- **Total Tests**: 24 passed, 0 failed (100% success rate).
- **Test Isolation**: In-memory SQLite session with table drop/re-seed fixtures ensuring test idempotency.

### Frontend Production Bundle Build
```
> frontend@0.0.0 build
> tsc -b && vite build

✓ built in 211ms
dist/index.html                   1.39 kB │ gzip:  0.76 kB
dist/assets/index-C3QHF1wv.css   18.52 kB │ gzip:  4.40 kB
dist/assets/index-DxeV2ull.js   337.91 kB │ gzip: 94.97 kB
```
- **TypeScript & Bundling**: 0 compilation errors, clean production bundle.

---

## 4. Honest Prototype Boundaries & Non-Claims

To maintain total transparency during evaluation and judging:
1. **Mock Gateways**: Alerts generate structured database entities, audit logs, and in-system UI notifications. Delivery over physical SMS or SMTP email networks is stubbed.
2. **Document Object Store**: Document records track institutional metadata, expiry dates, and verification lifecycles. Actual PDF files are represented by synthetic records rather than an Amazon S3 / MinIO binary object store.
3. **Synthetic Dataset**: All institution names (`Shivneri Institute of Technology`, `Malwa School of Engineering`), regional offices, and case identifiers are synthetic test fixtures created for SIH26262.
4. **Production AI Decision-Making**: AI models provide assistive risk scoring and document classification suggestions; statutory determinations legally remain restricted to human authorized officers.

---

## 5. How to Run Locally

### Start Backend API
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000 --host 127.0.0.1
# API Docs available at http://localhost:8000/docs
```

### Start Frontend Dev Server
```bash
cd frontend
npm run dev
# SPA active at http://localhost:5173/
```

### Run All Backend Tests
```bash
cd backend
source .venv/bin/activate
pytest tests/
```
