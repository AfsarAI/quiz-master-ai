# 🚀 Quiz-Master-AI: Enterprise AI-First Educational Assessment Platform

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![Next.js 14](https://img.shields.io/badge/Next.js-14%2B%20App%20Router-black.svg)](https://nextjs.org/)
[![React Native Expo](https://img.shields.io/badge/Expo-React%20Native-4630EB.svg)](https://expo.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Author: Mohd Afsar](https://img.shields.io/badge/Author-Mohd%20Afsar-blueviolet.svg)](https://github.com/AfsarAI)

**Quiz-Master-AI** is an enterprise-grade, AI-first educational assessment and personalized learning platform. By coupling **Retrieval-Augmented Generation (RAG)**, dense vector embeddings with **pgvector**, and structured LLM evaluation pipelines, Quiz-Master-AI automates the educational assessment lifecycle: from document ingestion and grounded question authoring to tamper-proof timed examinations, deterministic/rubric grading, and targeted conceptual weakness remediation.

> 👨‍💻 **Author & Lead Developer**: **Mohd Afsar** ([@AfsarAI](https://github.com/AfsarAI))  
> 💡 **Project Heritage & Evolution**: **Quiz-Master-AI** is the next-generation, AI-first evolution of [Quiz-Master-V2](https://github.com/AfsarAI/quiz-master-v2), conceived and developed by **Mohd Afsar**. While the original project established conventional quiz and curriculum management workflows, Quiz-Master-AI reimagines the platform from the ground up with automated document understanding, vector-based RAG generation, and server-side evaluation.

---

## 🏛️ Project Background & Heritage: Evolution from Quiz-Master-V2

### The Foundational Project: Quiz-Master-V2
[Quiz-Master-V2](https://github.com/AfsarAI/quiz-master-v2) was the original iteration of the Quiz Master concept (developed by [Mohd Afsar](https://github.com/AfsarAI) for the Modern Application Development 2 curriculum at IIT Madras). It provided a complete, conventional web assessment platform built with **Flask**, **SQLite**, **Celery**, and **Vue 3 (Bootstrap 5)**.

In Quiz-Master-V2, quiz administration followed a traditional, manually managed workflow:
- **Hierarchical Curriculum Taxonomy**: Administrators manually maintained a rigid educational hierarchy (`Qualification` → `Subject` → `Chapter` → `Quiz` → `Question`).
- **Manual Question Authoring**: Administrators and educators keyed in questions, multiple-choice options, and remarks individually via administrative CRUD forms.
- **Asynchronous Task Automation**: Celery workers managed scheduled tasks, including asynchronous CSV exports of student scores, daily inactivity reminders via Google Chat webhooks, and monthly performance report emails via SMTP.

### The Paradigm Shift: Why Quiz-Master-AI Was Developed
While Quiz-Master-V2 demonstrated solid full-stack curriculum management, manual question entry and static assessment workflows present inherent operational constraints:
1. **Authoring Overhead**: Creating and maintaining large question banks across disciplines requires dozens of hours of manual authoring.
2. **Syllabus Drift**: Updating questions when source textbooks, lecture notes, or syllabi change requires manual line-by-line maintenance.
3. **Binary Feedback**: Traditional static MCQs evaluate binary correctness ("Right" or "Wrong") without grounding explanations in specific source texts or evaluating conceptual nuance in open-ended answers.

**Quiz-Master-AI** was conceived and architected by **Mohd Afsar** as an independent, ground-up reimagination of the assessment platform to transform this manual workflow into an **AI-first, document-grounded assessment system**:
- Instead of manually authoring questions, educators can upload raw study materials (PDF, DOCX, TXT) and generate source-grounded quizzes directly from the text.
- Retrieval-Augmented Generation (RAG) grounds questions in retrieved document passages with explicit page and quote citations.
- Server-side dual evaluation pairs deterministic grading for objective items with structured rubric-assisted feedback for short-answer questions.
- Rather than reusing or patching the older Flask/Vue 3 codebase, Quiz-Master-AI was architected anew with modern technologies selected specifically for vector search, asynchronous AI orchestration, and omnichannel delivery (FastAPI, PostgreSQL 16 + pgvector, Next.js 14 App Router, and React Native Expo).

### Architectural & Functional Comparison

| Dimension | Quiz-Master-V2 (Original Foundation) | Quiz-Master-AI (AI-First Evolution) |
|---|---|---|
| **Repository** | [AfsarAI/quiz-master-v2](https://github.com/AfsarAI/quiz-master-v2) | [AfsarAI/quiz-master-ai](https://github.com/AfsarAI/quiz-master-ai) |
| **Primary Paradigm** | Conventional, manual quiz and content management | AI-driven document extraction, RAG generation, and adaptive learning |
| **Question Source** | Manually entered by administrators via CRUD forms | Automated RAG extraction & grounding from uploaded documents |
| **Content Structure** | Fixed relational taxonomy (`Qualification` → `Subject` → `Chapter`) | Dynamic document-grounded vector chunks with semantic topic tagging |
| **Backend Framework** | Python / Flask 3, Flask-RESTful, Flask-Security-Too | Python 3.12 / FastAPI (async), Pydantic v2, Instructor |
| **Database & Vector Search**| SQLite with Flask-SQLAlchemy (relational only) | PostgreSQL 16 + pgvector (HNSW cosine similarity) & async SQLAlchemy 2.0 |
| **Web Frontend** | Vue 3 (Options API / SFC), Vuex 4, Bootstrap 5 | Next.js 14+ (App Router, Server/Client components), Tailwind CSS, Zustand |
| **Mobile Access** | Mobile-responsive web browser only | Dedicated cross-platform React Native + Expo client (iOS & Android) |
| **Grading & Evaluation** | Static binary evaluation (Option ID comparison) | Dual engine: deterministic objective grading + rubric-assisted subjective feedback |
| **Background Processing**| Celery + Redis (CSV export, webhooks, email reports) | Celery & FastAPI BackgroundTasks (parsing, chunking, embeddings, RAG generation) |
| **Client Exam Security**| Standard web form submission | Zero client-trust exam shield (pre-submission answer key & rubric suppression) |

---

## 📌 Key Architectural Pillars

1. **Automated Document Ingestion & Vector Indexing**:
   - Sanitize, parse, and recursively chunk educational materials (PDF, DOCX, TXT) with semantic 100-token overlap.
   - Vectorize chunks using high-dimensional dense embeddings (`text-embedding-3-small` / Gemini `text-embedding-004`) indexed with HNSW in PostgreSQL 16.
2. **Source-Grounded RAG Quiz Generation**:
   - Source-grounded question generation with Pydantic & Instructor structured schema enforcement.
   - Every generated question contains a verbatim quotation and page citation from the source material to minimize hallucinations.
3. **Zero Client-Side Trust Exam Portal**:
   - The test-taking client **never receives correct options, explanations, or secret rubrics** before submission.
   - Client-side exam runtime features auto-save to `localStorage` / `AsyncStorage` and a **Visual Question Palette** (⚪ Not Visited, 🔵 Current, 🟢 Answered, 🔴 Not Answered, 🟣 Review).
4. **Server-Side Dual Evaluation Engine**:
   - Deterministic grading for objective questions (MCQs, Multi-Select, True/False).
   - Structured multi-criteria rubric evaluation with feedback and missing key-points for subjective short answers.
5. **Diagnostic Weakness Heatmap & 1-Click Adaptive Remediation**:
   - Tracks persistent errors by subject and topic in `user_weak_areas`.
   - Generates targeted adaptive practice sets to remediate conceptual blind spots.
6. **Omnichannel Experience**:
   - **Modern Web App**: Next.js 14+ App Router, Tailwind CSS, Lucide React, and Zustand.
   - **Mobile App**: Cross-platform React Native + Expo (iOS & Android).

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TB
    subgraph Clients["Omnichannel Clients"]
        Web["Next.js 14+ Web App<br/>(Tailwind + App Router)"]
        Mobile["React Native Expo App<br/>(iOS & Android)"]
    end

    subgraph Gateway["Application Layer"]
        FastAPI["FastAPI Backend (Python 3.12)<br/>- JWT & Argon2id Security<br/>- Ingestion Controller<br/>- Evaluation Engine"]
    end

    subgraph StorageLayer["Persistence & Vectors"]
        Postgres[("PostgreSQL 16 + pgvector<br/>- Relational Entities<br/>- Dense Vectors (1536 dim)<br/>- HNSW Cosine Index")]
        Redis[("Redis 7<br/>- Session Cache<br/>- Rate Limiting")]
        ObjectStore[("S3 / MinIO Storage<br/>- Source PDFs, DOCX, Notes")]
    end

    subgraph Workers["Asynchronous Pipeline"]
        Worker["Celery Worker / BackgroundTasks<br/>- Text Extraction & OCR<br/>- Semantic Chunking<br/>- Batch Embeddings<br/>- RAG Grounded Generator"]
    end

    subgraph AIProviders["LLM & Embedding Models"]
        LLM["LiteLLM / Gemini 3.8 / GPT-4o"]
        Embed["Gemini / OpenAI Embeddings"]
    end

    Web -->|REST / JWT| FastAPI
    Mobile -->|REST / JWT| FastAPI
    FastAPI --> Postgres
    FastAPI --> Redis
    FastAPI --> ObjectStore
    FastAPI --> Worker
    Worker --> Postgres
    Worker --> ObjectStore
    Worker --> Embed
    Worker --> LLM
```

---

## 📂 Monorepo Organization

```text
quiz-master-ai/
├── apps/
│   ├── web/                    # Next.js 14+ App Router Web Application
│   │   ├── src/
│   │   │   ├── app/            # App routes (/login, /register, /dashboard, /documents, /quiz/create, /quiz/[id]/take, /quiz/[id]/results, /analytics)
│   │   │   ├── components/     # Visual Question Palette, TimerBanner, CitationCard, Navbar
│   │   │   ├── lib/            # Typed ApiClient with auto Bearer token injection
│   │   │   ├── store/          # Zustand stores (useAuthStore, useExamStore)
│   │   │   └── styles/         # Tailwind CSS, glassmorphism design tokens & typography
│   │   ├── package.json
│   │   └── tailwind.config.ts
│   │
│   └── mobile/                 # React Native Expo Mobile Client
│       ├── src/
│       │   ├── screens/        # LoginScreen, RegisterScreen, DashboardScreen, ExamScreen, ResultsScreen, DocumentsScreen
│       │   ├── components/     # MobilePalette, QuestionNavigator
│       │   ├── navigation/     # React Navigation 6 Native Stack
│       │   └── services/       # MobileApiClient
│       ├── app.json
│       └── package.json
│
├── services/
│   ├── api/                    # FastAPI Backend Service (Python 3.12)
│   │   ├── app/
│   │   │   ├── api/v1/         # Route controllers (/auth, /documents, /quizzes, /attempts, /analytics)
│   │   │   ├── core/           # Config (pydantic-settings), database session, security (Argon2id + JWT)
│   │   │   ├── models/         # SQLAlchemy 2.0 Async models with FlexibleVector (pgvector & SQLite support)
│   │   │   ├── schemas/        # Pydantic v2 validation contracts & Instructor schemas
│   │   │   ├── services/       # RAG pipeline, TextExtractor, Chunker, Embeddings, LLM, Evaluation, Analytics
│   │   │   └── main.py         # FastAPI application entrypoint
│   │   ├── tests/              # Pytest test suite (100% passing)
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── worker/                 # Celery Asynchronous Processing Service
│       ├── tasks/              # parser.py, chunker.py, embedder.py, generator.py, evaluator.py
│       ├── celery_app.py
│       ├── Dockerfile
│       └── requirements.txt
│
├── packages/
│   └── shared-types/           # Shared TypeScript contracts and interfaces
│
├── docker-compose.yml          # Local infra (Postgres+pgvector, Redis, MinIO, API, Worker)
├── docker-compose.override.yml # Local development port mappings
├── .env.example                # Canonical environment variable specifications
└── README.md
```

---

## 🗄️ Database Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ DOCUMENTS : owns
    USERS ||--o{ QUIZZES : creates
    USERS ||--o{ QUIZ_ATTEMPTS : takes
    DOCUMENTS ||--o{ DOCUMENT_CHUNKS : contains
    DOCUMENTS ||--o{ QUIZZES : grounds
    QUIZZES ||--o{ QUESTIONS : contains
    QUESTIONS ||--o{ QUESTION_OPTIONS : has
    QUESTIONS ||--o{ DOCUMENT_CHUNKS : cites
    QUIZ_ATTEMPTS ||--o{ ATTEMPT_ANSWERS : records
    QUESTIONS ||--o{ ATTEMPT_ANSWERS : evaluated_in
    USERS ||--o{ USER_WEAK_AREAS : tracks
```

---

## 💾 Storage Architecture: Relational, Cache, and Object Storage

Understanding the distinction between Quiz-Master-AI's persistence tiers helps clarify the local development workflow:

| Component | Technology | Role in Quiz-Master-AI | Local Development Mode | Cloud Cost / Licensing |
|---|---|---|---|---|
| **Relational & Vectors** | **PostgreSQL 16 + pgvector** | Stores users, quizzes, questions, options, attempts, evaluations, and dense 1536-dim RAG vector embeddings. | Docker container on host port **5435** (`quizmaster_postgres`). | **100% Free** & Open Source (PostgreSQL License). |
| **In-Memory Cache & Broker** | **Redis 7** | Manages rate limiting, short-lived session caches, and Celery task broker queues. | Docker container on host port **6382** (`quizmaster_redis`). | **100% Free** & Open Source (BSD 3-Clause). |
| **Default Document Storage** | **Local Filesystem** (`./storage_uploads`) | Stores uploaded study materials (PDF, DOCX, TXT) directly in a secure, sandboxed project directory with magic-byte validation and path-traversal defense. | Enabled by default (`STORAGE_BACKEND="local"`). | **100% Free**. Zero external dependencies or cloud accounts. |
| **Optional Object Storage** | **MinIO (S3-Compatible)** | Enterprise S3-compliant bucket storage for organizations requiring AWS S3 API parity in staging/production. | Optional Docker profile (`docker compose --profile minio up -d minio`). | **100% Free** for local development (GNU AGPLv3). No AWS account required. |

### 💡 Does MinIO or Local Storage Require Paid Cloud Services?
- **No paid cloud services or AWS accounts are required**. MinIO is an open-source, S3-compliant object server. When executed locally in Docker on Ubuntu, it runs entirely on your own machine at zero cost.
- **Recommended Local Default**: For fast, zero-friction development without Docker image pull restrictions or registry authentication issues, Quiz-Master-AI defaults to **Local Filesystem Storage** (`STORAGE_BACKEND="local"`). Documents are securely stored in `./storage_uploads` on your local disk with strict MIME type checking, size enforcement (25MB), and directory-traversal protection.
- **Commercial/Enterprise MinIO Note**: While MinIO's community edition is free under AGPLv3, commercial enterprise features in managed multi-tenant cloud deployments require commercial MinIO licensing. However, this is never needed for local development or standard deployments of Quiz-Master-AI.

---

## 🚀 Ubuntu 24.04 Verified Local Setup Guide

Follow these exact, copy-pasteable instructions to set up, migrate, seed, and run Quiz-Master-AI on Ubuntu 24.04 LTS.

### 1. Prerequisites Installation (Ubuntu 24.04)

Open a terminal and ensure Docker, Python 3.12, and Node.js 18+ are installed:

```bash
# Update package lists
sudo apt update

# Install Python 3.12, venv, and development tools
sudo apt install -y python3 python3-venv python3-pip curl git jq

# Verify Docker and Docker Compose
docker --version
docker compose version
```

### 2. Environment Configuration

From the repository root (`/home/afsarai/Desktop/quiz-master-ai`):

```bash
# Copy the canonical environment template
cp .env.example .env
```

The default `.env` is pre-configured for local Ubuntu development:
- Relational Database: `postgresql+asyncpg://quizmaster:quizmaster_secret@localhost:5435/quizmaster_ai`
- Cache: `redis://localhost:6382/0`
- Document Storage: `STORAGE_BACKEND="local"` (stores files safely in `./storage_uploads`)

### 3. Start Core Infrastructure (PostgreSQL & Redis)

Start only the essential relational database and cache containers (avoiding MinIO pull errors):

```bash
# From repository root:
docker compose up -d postgres redis
```

Verify the containers are healthy and running on their dedicated host ports:
```bash
docker compose ps
```
> **Port Allocation**:
> - **PostgreSQL 16 + pgvector**: `localhost:5435` (mapped to internal `5432`)
> - **Redis 7**: `localhost:6382` (mapped to internal `6379`)
> 
> *(Optional: If you wish to use MinIO S3 object storage instead of local disk, run `docker compose --profile minio up -d minio` and set `STORAGE_BACKEND="s3"` in `.env`)*.

### 4. Backend Virtual Environment & Dependencies

Set up the Python 3.12 virtual environment in `services/api`:

```bash
# Navigate to the API service directory
cd services/api

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Upgrade pip and install all backend requirements
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Run Database Migrations (Alembic)

Apply the database schema and pgvector extension to PostgreSQL:

```bash
# Ensure you are in services/api with the virtual environment activated:
alembic upgrade head
```

Verify that the migration succeeded:
```bash
alembic current
# Expected output: 001_initial_schema (head)
```

### 6. Seed Demo Accounts (Student & Educator)

Execute the idempotent seeder script to populate the documented demo credentials with secure Argon2id hashes:

```bash
# Ensure you are in services/api with the virtual environment activated:
python scripts/seed_demo_data.py
```
> **Output**:
> `[SUCCESS] Demo seeding complete: created=2, preserved=0, errors=0`
>
> *(Note: The seeder is idempotent. Running it repeatedly preserves existing accounts without duplicate errors. Use `--reset-passwords` only if you need to restore the initial demo passwords).*

### 7. Run the FastAPI Backend

Start the FastAPI application with auto-reload:

```bash
# From services/api (with .venv active):
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation and health endpoints:
- **Swagger UI**: `http://localhost:8000/docs` (automatically redirects to `http://localhost:8000/api/v1/docs`)
- **OpenAPI Schema**: `http://localhost:8000/openapi.json` (or `http://localhost:8000/api/v1/openapi.json`)
- **API Health Check**: `http://localhost:8000/health` or `http://localhost:8000/api/v1/health`

### 8. Build Shared Types & Run Next.js Web Frontend

Open a new terminal window at the repository root:

```bash
# 1. Build the shared TypeScript contracts
npm --prefix packages/shared-types run build

# 2. Start the Next.js development server
npm --prefix apps/web run dev
```

Open `http://localhost:3001` in your browser.

---

## 🔑 Documented Demo Accounts

You can sign in immediately at `http://localhost:3001/login` or via the fast-fill buttons on the login page:

| Role | Email | Password | Intended Capabilities |
|---|---|---|---|
| **Student** | `student@example.com` | `Password123!` | Take timed exams, view question palette, submit answers, review results, and access personal weakness heatmap. |
| **Educator** | `educator@example.com` | `Password123!` | Upload syllabus documents, trigger RAG question generation, review citations, create quizzes, and view cohort analytics. |

---

## 🔍 Database Inspection & Verification Commands

Inspect the running database directly inside the Docker container at any time:

```bash
# From repository root:
# Check all created tables:
docker compose exec postgres psql -U quizmaster -d quizmaster_ai -c "\dt"

# Inspect the demo user accounts:
docker compose exec postgres psql -U quizmaster -d quizmaster_ai -c "SELECT id, email, full_name, role, is_active FROM users;"
```

---

## 🧪 Running Automated Tests

### Backend Test Suite (Pytest)
From `services/api` (with `.venv` active):
```bash
cd services/api
source .venv/bin/activate
pytest tests/ -v
```
*Executes all 13 tests covering authentication, idempotent seeding, Argon2id security, local storage & path-traversal defenses, document ingestion, zero-trust exam delivery, and server-side evaluation.*

### Web Frontend Build & Type Check
From repository root:
```bash
npm --prefix apps/web run build
```

### Mobile TypeScript Check
From repository root:
```bash
npx tsc --project apps/mobile/tsconfig.json --noEmit
```

---

## 🛑 Safely Stopping Services Without Data Loss

To pause development without deleting your database or uploaded documents:

```bash
# Stop containers safely (preserves PostgreSQL data volume and local uploads):
docker compose stop

# Restart containers later:
docker compose start

# CAUTION: Never run 'docker compose down -v' unless you want to permanently erase your local database!
```

---

## 🛡️ Security & Zero Answer Exposure Guarantees

1. **Pre-Submission Shield**:
   - The test-taking endpoint `GET /api/v1/quizzes/{id}` explicitly strips `is_correct` flags, explanations, and secret rubrics when queried in exam mode or by students.
   - Inspecting browser developer tools or network payloads reveals **zero answer keys**.
2. **Server-Side Grading Authority**:
   - Submissions (`POST /api/v1/attempts/{id}/submit`) submit **only student choices and written responses**.
   - Marks and evaluations are calculated exclusively on the server against authoritative keys stored in PostgreSQL.
3. **Client-Side Durability**:
   - Every selection and text edit is backed up immediately to `localStorage` (`exam_draft_{attemptId}`), protecting students against network drops or accidental tab closures.
4. **Prompt Injection Defense**:
   - Untrusted user documents are encapsulated as passive data inside `<context_chunks>` XML tags, isolating LLM instructions from malicious prompt injection payloads.

---

## 📊 Implementation Status: Verified Capabilities vs. Planned Roadmap

To provide complete transparency for technical reviewers and collaborators, the table below distinguishes between **verified, working capabilities** in the codebase and **planned roadmap features**:

### ✅ Verified & Implemented in Current Codebase

| Capability | Module / Layer | Implementation & Verification Evidence |
|---|---|---|
| **Role-Safe Authentication** | FastAPI / JWT | Argon2id password hashing; public registration strictly rejects `admin` role (`tests/test_auth.py` passing). |
| **Document Storage & Magic Bytes** | Storage Service | Enforces true magic-byte MIME checking (PDF, DOCX, TXT) and 25MB limits. Dual-backend S3/MinIO with automatic local disk fallback (`tests/test_documents.py` passing). |
| **Document Parsing & Semantic Chunking** | Extraction Engine | Text extraction via `pypdf`, `python-docx`, and UTF-8 parser. Semantic 100-token overlap chunking (`tests/test_documents.py` passing). |
| **Dense Vector Embeddings** | Embedding Service | 1536-dimensional vector embedding model support (Gemini & OpenAI) with deterministic offline fallback vectors (`tests/test_documents.py` passing). |
| **RAG Grounded Quiz Generation** | LLM Engine | Source-grounded question authoring with Pydantic & Instructor structured schema enforcement, verbatim quotes, and page citations (`tests/test_quizzes.py` passing). |
| **Prompt Injection Defense** | Ingestion Controller | Injected document text is wrapped in passive `<context_chunks>` XML boundary markers to separate instructions from untrusted data. |
| **Zero Client-Trust Exam Delivery** | Quiz Controller | Test-taking endpoints (`mode=exam`) strip correct options, explanations, and grading rubrics prior to submission (`tests/test_quizzes.py` passing). |
| **Server-Side Dual Grading Engine** | Evaluation Service | Deterministic evaluation for objective questions (MCQs, Multi-Select, True/False) and structured rubric LLM grading for short-answer questions (`tests/test_evaluation.py` passing). |
| **Adaptive Weakness Tracking** | Analytics Service | Diagnostic tracking of student weak areas by subject and topic (`user_weak_areas`), feeding adaptive practice recommendations. |
| **Modern Web Portal** | Next.js 14 App Router | 10 static/dynamic routes (`/login`, `/register`, `/dashboard`, `/documents`, `/quiz/create`, `/quiz/[id]/take`, `/quiz/[id]/results`, `/analytics`) with visual question palette and auto-save (Production build: 0 errors). |
| **Cross-Platform Mobile App** | React Native Expo | Mobile navigation stack with screens for Auth, Dashboard, Documents, Exam with mobile palette, and Results review (`tsc --noEmit`: 0 errors). |
| **Database Migrations** | Alembic Async Engine | Async migrations supporting pgvector extension and 9 relational tables (`001_initial_schema (head)`). |

### 🧭 Planned Roadmap & In-Progress Enhancements

| Feature / Initiative | Current Status | Planned Implementation |
|---|---|---|
| **Distributed Task Queue Scaling** | Celery task scaffolding configured in `services/worker/` | Scale Celery worker cluster across independent containers for massive batch uploads (currently handled synchronously or via FastAPI `BackgroundTasks` in local dev). |
| **Scanned Document OCR** | Digital text extraction active | Integrate Tesseract OCR / multimodal vision parsing for scanned, image-only PDFs. |
| **Standalone Mobile Store Builds** | Expo client code verified | Configure EAS Build pipelines for Google Play Store (`.apk`/`.aab`) and Apple App Store (`.ipa`) release packages. |
| **Interactive Remedial Dialogue** | Analytics weakness map active | Add a multi-turn conversational AI tutor allowing students to dispute marks or ask follow-up questions directly on missed exam items. |

---

## 👤 Author & Maintainer

**Mohd Afsar**
- **GitHub**: [@AfsarAI](https://github.com/AfsarAI)
- **Current Project**: [Quiz-Master-AI](https://github.com/AfsarAI/quiz-master-ai)
- **Original Foundation**: [Quiz-Master-V2](https://github.com/AfsarAI/quiz-master-v2)

---

## 📜 License
MIT License. Designed, built, and maintained by **Mohd Afsar**.
