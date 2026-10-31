# ARGUS — AICTE Approval & Compliance Intelligence Platform

> **Smart India Hackathon (SIH26262)**  
> **Tagline:** *Complete Visibility. Accountable Governance.*  
> **Disclaimer:** ARGUS is a proposed hackathon prototype solution, not an official or endorsed AICTE production application. All institutional names and application records are synthetic demo data.

---

## 1. System Architecture

ARGUS is built as a production-structured full-stack platform featuring a decoupled React 18 TypeScript SPA frontend and a high-performance Python FastAPI REST backend with dual SQLite / PostgreSQL persistence.

```mermaid
graph TD
    User["Web Browser Client"] -->|HTTP / React 18 SPA| Frontend["Frontend SPA (Port 5173)"]
    Frontend -->|Reverse Proxy /api/*| Backend["FastAPI REST Backend (Port 8000)"]
    
    subgraph "FastAPI Backend Layer"
        Backend --> Auth["Auth & RBAC (JWT + Bcrypt)"]
        Backend --> Apps["Applications Router (/applications)"]
        Backend --> Comp["Compliance Router (/compliance)"]
        Backend --> EVC["EVC Desk Router (/evc)"]
        Backend --> Docs["Documents Router (/documents)"]
        Backend --> Rules["Rules Engine (/rules)"]
        Backend --> Alerts["Alerts Service (/alerts)"]
        Backend --> Audit["Audit Stream (/audit)"]
    end
    
    subgraph "Core Services & Persistence"
        Rules --> Engine["Idempotent Automation Engine"]
        Engine --> Dedupe["Deduplication Key Store"]
        Audit --> Trail["Correlated Audit Stream (COR-XXXX)"]
        Backend --> ORM["SQLAlchemy 2.0 ORM"]
        ORM --> DB[("Database (PostgreSQL / SQLite)")]
    end
```

---

## 2. Key Features

- **Modern Glassmorphic Control HUD**: Dark forest palette (`#07150e`, `#0c1e15`) with electric lime accents (`#d4f458`), live KPI cards, urgent applications queue, and live audit feed.
- **Route Progression Strip**: Enforces strict state transitions across 4 statutory routes (`Scrutiny only`, `Scrutiny + EVC`, `EVC + SAC/SHC`, `Only EVC`).
- **Deficiency Return & Resumption Loop**: Formal return mechanism requiring an explicit reason, recording previous stage in `resume_stage`, and restoring the workflow upon institution resubmission.
- **EVC Desk**: Committee visit scheduling with panel assignments and structured findings report submission.
- **Separation of Duties**: Institutional evidence upload sets `Pending Verification`; submitting roles are strictly forbidden from self-approving.
- **Statutory Rules Engine**: Evaluates deadlines and expiry dates against active thresholds (`DL-01` reminders, `DL-02` overdue escalations, `DOC-01` document warnings/expiry).
- **Guaranteed Idempotency**: Unique composite keys (`target:rule:date`) ensure repeated evaluation cycles never generate duplicate alerts.
- **Transaction-Correlated Regulatory Audit**: All mutations write append-only audit events with unique correlation IDs (`COR-XXXX`).
- **Zero-Downtime Client Resilience**: The frontend automatically connects to the live FastAPI backend with fallback to in-memory synthetic state if the server is offline.

---

## 3. Demo Personas & Credentials

All demo accounts share the unified development password: `Demo@2026!`

| Role Persona | Demo Email | Primary Capabilities | Scope / Restrictions |
|:---|:---|:---|:---|
| **Scrutiny Officer** | `scrutiny@aicte.gov.in` | Scrutiny review, stage advancement, deficiency return with reason | Regional case queue |
| **Institution User** | `institution@shivneri.edu.in` | Resubmit deficient cases, upload compliance evidence, file renewals | Scoped to own institution (`INST-014`); cannot self-verify |
| **Committee Coordinator** | `coordinator@aicte.gov.in` | Schedule EVC visits, assign committee panel, submit visit findings | EVC queue operations |
| **Regional Officer** | `regional@aicte.gov.in` | Verify compliance evidence, verify document renewals, create synthetic cases | Regional oversight (`West`) |
| **Competent Authority** | `authority@aicte.gov.in` | Record final statutory determination (`Approved` / `Rejected`) | Reserved Council decisions |
| **System Operator** | `admin@aicte.gov.in` | Full administrative bypass, policy configuration, demo reset | Global system scope |

---

## 4. Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Docker (optional, for PostgreSQL 16)

### Option A: Running with Local SQLite (Fastest)

#### 1. Start the Backend API
```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations and seed synthetic records
python -m app.db.init_db

# Start FastAPI server
uvicorn app.main:app --port 8000 --host 127.0.0.1 --reload
```
- API Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)

#### 2. Start the Frontend SPA
```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start Vite dev server
npm run dev
```
- Open [http://localhost:5173/](http://localhost:5173/) in your browser.
- Look for the `● Live API` badge in the Topbar confirming live REST backend synchronization.

---

### Option B: Running with PostgreSQL via Docker

```bash
# Start PostgreSQL 16 container
docker compose up -d

# Point backend to PostgreSQL in backend/.env
# DATABASE_URL=postgresql://argus_user:argus_secret_2026!@localhost:5432/argus_db

# Initialize database schema and start backend
cd backend
source .venv/bin/activate
python -m app.db.init_db
uvicorn app.main:app --port 8000 --reload
```

---

## 5. Automated Testing & Verification

### Run Backend Pytest Suite
```bash
cd backend
source .venv/bin/activate
pytest tests/
```
**Results:** `24 passed in 8.36s (100% success rate)`
- `tests/test_auth.py` (7 tests: login, tokens, password hashing, role permissions)
- `tests/test_health.py` (2 tests: health endpoints, schema metadata)
- `tests/test_migrations.py` (1 test: Alembic configuration and migration head validation)
- `tests/test_rules_engine.py` (6 tests: rule catalog, config updates, cycle evaluation, idempotency, alert triage)
- `tests/test_worker.py` (2 tests: autonomous background worker daemon single-run and idempotency)
- `tests/test_workflow.py` (6 tests: stage progression, deficiency returns, EVC flow, duty separation)

### Validate Frontend TypeScript & Build
```bash
cd frontend
npm run build
```
**Results:** `tsc -b && vite build` succeeds in ~211ms with 0 errors.

---

## 6. Regulatory Rules Catalog

| Rule ID | Rule Name | Trigger Condition | Automated Action |
|:---|:---|:---|:---|
| `WF-01` | Route stage completion | Authorized stage completed | Advance to next route stage when prerequisites pass |
| `WF-02` | Deficiency return & resubmission | Return with reason / resubmit | Preserve resume stage; route response for scrutiny |
| `DL-01` | Upcoming deadline reminder | Unresolved item due within `reminder_days` | Spawn `medium` reminder alert for owner role |
| `DL-02` | Overdue escalation | Unresolved item due date < simulation date | Spawn `high` escalation alert for `escalation_role` |
| `EVC-01` | EVC scheduling queue | Case reaches `EVC Scheduling` | Ensure active scheduling task exists |
| `EVC-02` | EVC report follow-up | Visit completed without report | Create report follow-up task for coordinator |
| `CMP-01` | Evidence review task | Institution submits compliance evidence | Set `Pending Verification`; assign regional reviewer |
| `DOC-01` | Document expiry watch | Document expires within `expiry_days` or expired | Flag warning alert or mark expired with escalation |

---

## 7. Documentation

- [Prototype Status & Verification Record](file:///Users/arijeetsingh/ARGUS/Documentations/PROTOTYPE_STATUS.md)
- [Production Implementation Blueprint](file:///Users/arijeetsingh/ARGUS/Documentations/docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md)
