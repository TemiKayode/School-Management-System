# SchoolMS — School Management System

[![CI/CD](https://github.com/TemiKayode/School-Management-System/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/TemiKayode/School-Management-System/actions/workflows/ci-cd.yml)
![Status](https://img.shields.io/badge/status-active-success)
![Node](https://img.shields.io/badge/node-20-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

A production-ready, full-stack school management platform with role-based dashboards for **Admin**, **Teacher**, **Student**, and **Parent**. Covers the full academic lifecycle — attendance, grades, fees, assignments, e-learning, timetable, transport, library, and real-time notifications — all in one system.

---

## Screenshots

### Login Page
![Login Page](docs/screenshots/login.png)

### Admin Dashboard
![Admin Dashboard](docs/screenshots/admin-dashboard.png)

### Teacher Dashboard
![Teacher Dashboard](docs/screenshots/teacher-dashboard.png)

### Student Dashboard
![Student Dashboard](docs/screenshots/student-dashboard.png)

---

## Table of Contents

- [Demo Credentials](#demo-credentials)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running Locally (Node)](#running-locally-node)
- [Running with Docker Compose](#running-with-docker-compose)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Variables](#environment-variables)
- [Monitoring & Logging](#monitoring--logging)
- [Error Tracking (Sentry)](#error-tracking-sentry)
- [CI/CD Pipeline](#cicd-pipeline)
- [API Reference](#api-reference)

---

## Demo Credentials

After running the seed (`npm run db:seed` or Docker Compose auto-seeds on first start):

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | `admin@school.com`     | `Admin@123` |
| Teacher | `teacher@school.com`   | `Admin@123` |
| Student | `student@school.com`   | `Admin@123` |

---

## Architecture

```
Browser
  │
  ▼
Nginx (port 80/443)
  ├── /          → Next.js Frontend  (port 3000)
  ├── /api/      → Express Backend   (port 5000)
  └── /socket.io → Socket.IO (WS)

Backend
  ├── PostgreSQL  (primary DB)
  ├── Redis       (cache + session blacklist)
  ├── Socket.IO   (real-time events)
  └── Notifications Microservice (port 5010)

Monitoring
  ├── Prometheus  (metrics scraping, port 9090)
  ├── Grafana     (dashboards, port 3001)
  └── ELK Stack   (logs: ES 9200, Kibana 5601)
```

```mermaid
flowchart LR
    U[User Browser] --> N[Nginx]
    N --> F[Next.js Frontend]
    N --> B[Express Backend]
    F -- REST /api/v1 --> B
    B --> P[(PostgreSQL)]
    B --> R[(Redis)]
    B <--> S[Socket.IO]
    B --> NS[Notifications Svc]
    NS --> R
    B --> PR[Prometheus]
    PR --> GF[Grafana]
    B --> ES[Elasticsearch]
    ES --> KB[Kibana]
```

---

## Features

| Domain | Capabilities |
|--------|--------------|
| **Auth** | JWT + Refresh tokens, Google/Microsoft OAuth, MFA (TOTP), session blacklist |
| **Roles** | Admin, Teacher, Student, Parent — RBAC on every endpoint |
| **Students** | Enroll, assign to class, view CGPA, attendance, fee status, assignments |
| **Teachers** | Class management, timetable, assignment creation & grading, workload overview |
| **Attendance** | Mark daily attendance per class, student view, charts |
| **Exams** | Create exams, enter results, auto-calculate CGPA, generate report cards |
| **Assignments** | Create with due dates, student submission tracking, inline grading |
| **Fees** | Fee structures, payments (Cash / Stripe / PayPal / Flutterwave), statements |
| **Timetable** | Weekly slot management, teacher schedule, student day view |
| **E-Learning** | Course creation, lessons, enrollment, progress tracking |
| **Library** | Book catalogue, borrowing records |
| **Transport** | Route management, student transport assignment |
| **Notifications** | In-app, push (VAPID), Socket.IO real-time |
| **Messaging** | Role-scoped in-app messaging |
| **Monitoring** | Prometheus metrics, Grafana dashboards, ELK logs, Sentry errors |
| **GDPR** | Consent audit, data export, deletion endpoints |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| State | TanStack Query (React Query), Zustand |
| Backend | Node.js 20, Express, TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Realtime | Socket.IO |
| Auth | JWT, bcrypt, Passport (OAuth) |
| Payments | Stripe, PayPal, Flutterwave |
| Storage | AWS S3 |
| Email | SendGrid |
| SMS | Twilio |
| Error tracking | Sentry (Node SDK + Next.js SDK) |
| Metrics | Prometheus + Grafana |
| Logs | Winston + ELK Stack |
| Reverse proxy | Nginx |
| Containers | Docker + Docker Compose |
| Orchestration | Kubernetes (Kustomize) |
| CI/CD | GitHub Actions → GHCR → K8s |

---

## Project Structure

```
School-Management-System/
├── backend/                   # Express API
│   ├── prisma/                # Schema + migrations + seed
│   ├── src/
│   │   ├── modules/           # Feature modules (students, teachers, exams…)
│   │   ├── middleware/        # auth, RBAC, GDPR, error handler
│   │   ├── utils/             # Sentry, cache, logger, payments
│   │   └── config/            # DB, Redis, Socket.IO
│   └── Dockerfile
├── frontend/                  # Next.js App Router
│   ├── src/app/               # Pages (admin/, teacher/, student/)
│   ├── src/components/        # Shared UI components
│   ├── src/store/             # Zustand auth store
│   ├── src/lib/               # API client, utils
│   ├── public/                # favicon.svg, icons, webmanifest
│   ├── sentry.*.config.ts     # Sentry (client/server/edge)
│   └── Dockerfile
├── services/
│   └── notifications/         # Redis-backed notification microservice
├── k8s/
│   ├── base/                  # Namespace, Postgres, Redis, Backend, Frontend, Ingress
│   └── overlays/production/   # Kustomize production overrides
├── nginx/
│   └── nginx.conf             # Reverse proxy (gzip, rate limiting, WebSocket)
├── monitoring/
│   ├── prometheus/            # prometheus.yml scrape config
│   ├── grafana/               # Dashboard provisioning
│   └── logstash/              # Pipeline config
├── .github/workflows/
│   └── ci-cd.yml              # Test → Docker → K8s deploy
├── docker-compose.yml
└── README.md
```

---

## Running Locally (Node)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally (or use Docker just for Postgres)
- Redis running locally (or use Docker just for Redis)

### 1. Clone & install

```bash
git clone https://github.com/TemiKayode/School-Management-System.git
cd School-Management-System
npm install           # installs root workspace deps
```

### 2. Configure environment

```bash
# Copy backend env template
cp backend/.env.example backend/.env   # then edit with your values
# Copy frontend env
cp frontend/.env.local.example frontend/.env.local  # or just set below
```

Minimum required values in `backend/.env`:

```env
DATABASE_URL=postgresql://sms_user:sms_pass@localhost:5432/school_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-at-least-32-chars
REFRESH_TOKEN_SECRET=your-refresh-secret-at-least-32-chars
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 3. Setup database

```bash
cd backend
npx prisma migrate deploy    # run all migrations
npx prisma generate          # generate Prisma client
npm run db:seed              # seed demo users, classes, timetable…
cd ..
```

### 4. Start both servers

```bash
npm run dev
```

This runs the root workspace script which starts both the backend (port 5000) and frontend (port 3000) concurrently.

Or start them individually:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### 5. Open in browser

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api/v1 |
| Health check | http://localhost:5000/health |
| Metrics | http://localhost:5000/metrics |

---

## Running with Docker Compose

Docker Compose starts everything — database, cache, app, nginx, monitoring, and logging — with one command.

### Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Ports 80, 3000, 5000, 5432, 6379 must be free

### 1. Clone

```bash
git clone https://github.com/TemiKayode/School-Management-System.git
cd School-Management-System
```

### 2. Configure secrets

The backend reads from `backend/.env`. Copy the example and fill in secrets:

```bash
cp backend/.env.example backend/.env
```

At minimum review/change:

```env
JWT_SECRET=change-me-to-32-plus-random-chars
REFRESH_TOKEN_SECRET=change-me-to-another-secret
```

Payment and OAuth keys are optional for local testing — the app works without them.

### 3. Start all services

```bash
docker compose up -d
```

First run downloads images and builds the backend and frontend. This takes 3–5 minutes.

```bash
# Watch startup logs
docker compose logs -f backend frontend

# Check all containers are healthy
docker compose ps
```

### 4. Run database migrations & seed

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

### 5. Access services

| Service | URL |
|---------|-----|
| App (via Nginx) | http://localhost |
| Frontend (direct) | http://localhost:3000 |
| Backend API (direct) | http://localhost:5000/api/v1 |
| Grafana | http://localhost:3001 (admin / admin) |
| Prometheus | http://localhost:9090 |
| Kibana | http://localhost:5601 |
| Elasticsearch | http://localhost:9200 |

### Useful Docker commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (wipes database!)
docker compose down -v

# Rebuild after code changes
docker compose build --no-cache backend
docker compose up -d backend

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f nginx

# Open a shell in the backend container
docker compose exec backend sh

# Run Prisma Studio (DB browser)
docker compose exec backend npx prisma studio
```

### Lite mode (no monitoring stack)

To skip ELK + Prometheus + Grafana and save memory:

```bash
docker compose up -d postgres redis backend frontend nginx
```

---

## Kubernetes Deployment

Kubernetes manifests are in `k8s/` using [Kustomize](https://kustomize.io/).

### Prerequisites

- `kubectl` connected to a cluster (local: `minikube`, `kind`, or cloud: EKS/GKE/AKS)
- `kustomize` CLI (or use `kubectl apply -k`)
- Container images pushed to a registry (see CI/CD section)

### 1. Apply base manifests (local/dev)

```bash
# Creates: namespace, postgres, redis, backend, frontend, ingress
kubectl apply -k k8s/base/
```

### 2. Verify pods are running

```bash
kubectl get pods -n schoolms
kubectl get services -n schoolms
kubectl get ingress -n schoolms
```

### 3. Run migrations inside the cluster

```bash
kubectl exec -n schoolms deploy/backend -- npx prisma migrate deploy
kubectl exec -n schoolms deploy/backend -- npx prisma db seed
```

### 4. Production overlay

The production overlay in `k8s/overlays/production/` sets:
- Image names from GHCR (`ghcr.io/your-org/schoolms-backend:sha`)
- 3 backend replicas, 2 frontend replicas

Update the org name first:

```bash
# Edit k8s/overlays/production/kustomization.yaml
# Replace "your-org" with your GitHub username/org

kubectl apply -k k8s/overlays/production/
```

### 5. Update secrets for production

```bash
# Replace the example secrets before applying
kubectl create secret generic backend-secret \
  --namespace schoolms \
  --from-literal=JWT_SECRET='your-real-secret' \
  --from-literal=REFRESH_TOKEN_SECRET='your-real-refresh-secret' \
  --from-literal=SENTRY_DSN='your-sentry-dsn' \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 6. Auto-scaling

HPAs are pre-configured:
- Backend: 2–10 pods, scales at 70% CPU / 80% memory
- Frontend: 2–6 pods, scales at 70% CPU

```bash
kubectl get hpa -n schoolms
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | Access token signing secret (32+ chars) | Yes |
| `REFRESH_TOKEN_SECRET` | Refresh token secret (32+ chars) | Yes |
| `SENTRY_DSN` | Sentry error tracking DSN | Recommended |
| `STRIPE_SECRET_KEY` | Stripe payments | Optional |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal payments | Optional |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave payments | Optional |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | Optional |
| `MS_CLIENT_ID` / `MS_CLIENT_SECRET` | Microsoft OAuth | Optional |
| `SENDGRID_API_KEY` | Email delivery | Optional |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | SMS | Optional |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | File uploads to S3 | Optional |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push notifications | Optional |

### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (browser) | Recommended |
| `SENTRY_AUTH_TOKEN` | For source map uploads in CI | Optional |

---

## Monitoring & Logging

### Prometheus + Grafana

The backend exposes `/metrics` (Prometheus format). Prometheus scrapes it every 15s.

- Open Grafana at http://localhost:3001
- Default credentials: `admin` / `admin`
- Prometheus datasource is pre-provisioned

### ELK Stack

- Backend logs via Winston → Logstash pipeline → Elasticsearch
- Open Kibana at http://localhost:5601
- Create an index pattern: `logs-*`

### Health endpoint

```bash
curl http://localhost:5000/health
# {"status":"ok","timestamp":"2025-04-26T..."}
```

---

## Error Tracking (Sentry)

Both the backend (Node.js SDK) and frontend (Next.js SDK) send errors to Sentry.

### Backend

`SENTRY_DSN` in `backend/.env` — already wired up in `src/utils/sentry.ts`.

### Frontend

`NEXT_PUBLIC_SENTRY_DSN` in `frontend/.env.local` — configured in:
- `sentry.client.config.ts` (browser errors + Session Replay)
- `sentry.server.config.ts` (SSR/API route errors)
- `sentry.edge.config.ts` (Edge runtime)

To upload source maps in CI add `SENTRY_AUTH_TOKEN` to GitHub secrets.

---

## CI/CD Pipeline

`.github/workflows/ci-cd.yml` runs on every push to `main`:

```
Push to main
  │
  ├── test-backend    → install, prisma generate, build, npm test
  ├── test-frontend   → install, next build
  │
  └── docker (after tests pass)
        ├── Build & push backend image  → ghcr.io/your-org/schoolms-backend:sha
        ├── Build & push frontend image → ghcr.io/your-org/schoolms-frontend:sha
        │
        └── deploy (production environment gate)
              └── kubectl apply -k k8s/overlays/production/
```

### Required GitHub secrets

| Secret | Value |
|--------|-------|
| `KUBECONFIG` | Base64-encoded kubeconfig for your cluster |
| `SENTRY_AUTH_TOKEN` | Sentry token for source map upload (optional) |

Images are pushed to GitHub Container Registry (GHCR) automatically using `GITHUB_TOKEN` (no extra secret needed).

---

## API Reference

Base URL: `http://localhost:5000/api/v1`

All protected endpoints require: `Authorization: Bearer <access_token>`

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login → returns `accessToken`, `refreshToken`, `user` |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Blacklist token |
| POST | `/auth/register` | Register new user |

### Key endpoints

| Resource | Base Path | Notes |
|----------|-----------|-------|
| Students | `/students` | CRUD, `GET /students/:id/grades`, `/fees`, `/attendance` |
| Teachers | `/teachers` | CRUD, stats at `/teachers/stats` |
| Classes | `/classes` | CRUD, `/classes/my` for teacher's classes |
| Timetable | `/timetable` | CRUD, `/timetable/my` for current user's slots |
| Exams | `/exams` | CRUD, `/exams/my-results` for student results |
| Assignments | `/assignments` | CRUD, submissions, grading |
| Attendance | `/attendance` | Mark and query, `?mine=true` for student view |
| Fees | `/fees` | Fee structures + `/fees/my` for student payments |
| Dashboard | `/dashboard` | Admin stats; `/dashboard/teacher` for teacher stats |
| Announcements | `/announcements` | Broadcast messages |
| Notifications | `/notifications` | In-app notification feed |
| Library | `/library` | Books + borrowing records |
| Transport | `/transport` | Routes + assignments |
| E-Learning | `/elearning` | Courses + lessons + enrollment |

---

## License

MIT — free for educational and school use. Attribution appreciated.
