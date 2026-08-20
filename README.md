# MedInsight

MedInsight is a privacy-conscious health record application that turns laboratory reports into structured, longitudinal health information.

It combines deterministic lab-value extraction and classification with timeline-based tracking, manual measurement entry, doctor-visit summaries, and bounded AI explanations for individual biomarkers.

> **Live web app:** https://medinsight-web.onrender.com  
> **Backend API:** https://medinsight-1sne.onrender.com  
> **Status:** Public web deployment available. Native Android, iOS, and Windows installers are not released yet.

## What MedInsight does

MedInsight is designed to help a user organize laboratory results over time instead of treating every PDF as an isolated document.

Core capabilities include:

- Uploading machine-readable or scanned laboratory PDFs
- Deterministic extraction of supported biomarkers, values, units, and report-provided reference ranges
- Low / normal / high classification using only the reference information supplied by the report
- Longitudinal biomarker history and trend views
- Manual entry of individual laboratory measurements without creating a fake report
- A chronological health-history timeline
- A deterministic doctor-visit brief built from saved structured results
- Optional AI explanations for a single biomarker using a privacy-minimized structured context
- Per-user authentication and data isolation with Supabase Auth

MedInsight does **not** diagnose disease, assign clinical severity, recommend medication, or invent medical reference ranges.

## Using the live application

The normal way to use MedInsight is through the deployed web application, not by running code from GitHub.

1. Open **https://medinsight-web.onrender.com**.
2. Sign in with an existing MedInsight account, or create an account when public email confirmation is available.
3. Upload a laboratory PDF from the **Reports** area, or add an individual value with **Add measurement**.
4. Review the **Overview** for the latest measurements, items outside their supplied reference ranges, and recent history.
5. Open **Biomarkers** to inspect a measurement's history and deterministic trend.
6. Use **Explain this result** for a bounded educational explanation of one saved biomarker.
7. Open **Doctor Brief** for a concise, deterministic summary that can help prepare for a healthcare appointment.

### Current signup note

The application is deployed publicly, but transactional email delivery for unrestricted new-account confirmation is still being configured. Existing authenticated accounts work. This limitation is deployment configuration, not a requirement to run the source code locally.

### Free-hosting behavior

The current deployment uses free hosting. The backend may sleep after a period of inactivity, so the first request after a long idle period can take longer while the service wakes up.

## Application availability

The repository contains a cross-platform Expo client, but the currently released user-facing version is the **web application**.

| Platform | Current status | How to use it |
| --- | --- | --- |
| Web | Live | Open https://medinsight-web.onrender.com |
| Android | Source ready for Expo/EAS packaging | Installer not released yet |
| iOS | Source ready for Expo/EAS packaging | Installer not released yet |
| Windows | Planned desktop packaging | Installer not released yet |

A user does **not** need Python, Node.js, Docker, Supabase credentials, or an AI API key to use the deployed web application.

## Architecture

```text
Browser / Expo client
        |
        | HTTPS + Supabase access token
        v
FastAPI backend (Render)
        |
        +--> Supabase Auth / PostgreSQL
        |
        +--> pypdf / PDFium / Tesseract OCR
        |
        +--> deterministic biomarker parser and trend engine
        |
        +--> Groq API for optional bounded AI explanations
```

The core health-data pipeline is deterministic. AI is not used to parse values, calculate ranges, determine status, or generate the doctor-visit brief.

## Technology stack

### Frontend

- Expo / React Native
- TypeScript
- Expo Router
- Responsive web and mobile UI
- Supabase client authentication

### Backend

- Python 3.12 production runtime
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL via `psycopg`
- Pydantic

### Document processing

- `pypdf` for machine-readable PDFs
- PDFium for page rendering
- Tesseract OCR for scanned reports

### Infrastructure

- Supabase Auth
- Supabase PostgreSQL
- Render Docker web service
- Render static-site frontend

### Optional AI explanation layer

- Groq OpenAI-compatible Responses API
- `openai/gpt-oss-20b` default model
- Existing OpenAI-compatible Python SDK
- Validated structured output

## Deterministic biomarker extraction

MedInsight uses bounded, format-tolerant deterministic extraction for common laboratory layouts.

The parser currently recognizes a curated vocabulary of 36 common biomarkers through explicit aliases and supports common single-line, whitespace/pipe table, dot-leader, and short multi-line layouts. It handles decimal points, decimal commas, carefully constrained thousands grouping, common laboratory units, and report-supplied ranges or comparison thresholds.

Units are normalized only when their spelling is safely equivalent. MedInsight does not convert values between units and does not infer a medical reference range when the report does not provide one.

A measurement without a usable report-provided reference remains **Not classified**. Missing units, ambiguous values, unsupported analytes, and uncertain layouts are rejected instead of guessed.

The parser is intentionally bounded and does not claim to support every laboratory, analyte, or possible report layout.

## PDF extraction and OCR

Machine-readable PDFs are extracted with `pypdf`. When direct extraction produces insufficient text, the backend renders pages with PDFium and runs local Tesseract OCR.

Current OCR safeguards include:

- Maximum 25 pages
- 250 DPI page rendering
- 30-second timeout per page
- English OCR configuration
- No cloud OCR service
- No persistence of raw PDFs, rendered page images, or complete extracted/OCR text

OCR quality depends on scan resolution, orientation, contrast, and document layout.

## Manual measurements

Users can save an individual laboratory measurement directly instead of creating or uploading a PDF.

Manual and report-derived measurements share the same longitudinal biomarker history while preserving their provenance. Manual entries have their own measurement date and owner and do not create artificial report records.

Reference information is optional. If a reference is supplied, MedInsight reuses its deterministic classifier; if no reference is supplied, the measurement remains **Not classified**.

Manual measurements can be deleted by their owner. Editing is currently handled as delete-and-readd rather than an in-place edit flow.

## Trends and dashboard

The dashboard and biomarker history use the effective measurement date:

- report-derived results use the report date
- manual measurements use their explicit measurement date

Trends are calculated only across comparable units. Mixed-unit histories are intentionally treated as non-comparable rather than converted automatically.

## Doctor Visit Brief

`GET /dashboard/doctor-brief` creates an on-demand deterministic summary from the authenticated user's structured record.

It can include:

- recent reports
- latest biomarker measurements
- latest values outside supplied reference ranges
- comparable deterministic changes over time
- measurements without usable reference information
- a small set of factual questions to discuss with a healthcare professional

The brief does not use AI and is not persisted.

## AI biomarker explanations

MedInsight offers an optional educational explanation for a single saved biomarker through:

```text
POST /biomarkers/{normalized_name}/explain
```

The deterministic parser, report-provided reference data, stored value, status, date, and trend remain the source of truth.

Only an allowlisted structured biomarker context is sent to the AI provider. MedInsight does not send the raw PDF, OCR image, complete report text, filename, user email, user ID, report ID, or unrelated health history to the provider.

The backend currently uses Groq's OpenAI-compatible API. Server-side configuration uses:

```env
GROQ_API_KEY=
MEDINSIGHT_AI_MODEL=openai/gpt-oss-20b
```

The key belongs only on the backend. It must never be placed in an `EXPO_PUBLIC_*` variable or committed to GitHub.

If the AI provider is unavailable, deterministic MedInsight features continue to work and only the optional explanation feature is affected.

AI explanations are educational and can contain errors. They are not diagnoses or treatment recommendations.

## Authentication and data ownership

MedInsight uses Supabase Auth with email/password sessions.

The backend verifies access tokens against the Supabase JWKS endpoint and validates signature, issuer, audience, expiration, issued-at time, and subject. Protected health-data endpoints require authentication; `/` and `/health` remain public.

Every persisted report and manual measurement is associated with the authenticated user's UUID. Report, biomarker, history, trend, dashboard, doctor-brief, and AI-explanation queries apply user ownership at the database query boundary.

PostgreSQL Row Level Security is enabled as defense in depth. Application-level ownership checks remain mandatory because privileged server roles can bypass RLS.

## Privacy and security principles

- Raw uploaded reports are not stored as permanent application data.
- Complete extracted/OCR report text is not persisted.
- AI receives only a bounded structured context for the selected biomarker.
- Database credentials and provider secrets remain server-side.
- The Expo client uses only public Supabase configuration.
- Real `.env` files are ignored by Git.
- A Supabase service-role secret must never be placed in the client.
- Unknown or ambiguous medical data is rejected or left unclassified instead of guessed.

## Repository security

Only example environment files belong in source control.

`backend/.env.example` contains placeholders such as:

```env
DATABASE_URL=sqlite:///backend/data/medinsight.db
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_JWT_AUDIENCE=authenticated
MEDINSIGHT_CORS_ORIGINS=https://your-frontend.example.com
GROQ_API_KEY=
MEDINSIGHT_AI_MODEL=openai/gpt-oss-20b
```

`apps/mobile/.env.example` contains public client configuration placeholders only.

Never commit:

- a real `DATABASE_URL`
- Supabase database passwords
- Supabase service-role / secret keys
- `GROQ_API_KEY`
- private certificates or signing keys
- real patient reports or private medical datasets

## Running locally

### 1. Clone the repository

```sh
git clone https://github.com/Aryamanjmwl/MedInsight.git
cd MedInsight
```

### 2. Backend environment

Create `backend/.env` from `backend/.env.example` and provide the required local values.

Create/activate a Python environment and install dependencies:

```sh
python -m venv backend/.venv
python -m pip install -r backend/requirements.txt
```

Run database migrations:

```sh
python -m alembic -c backend/alembic.ini upgrade head
```

Start the backend from the repository root:

```sh
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --env-file backend/.env
```

### 3. Frontend environment

Create `apps/mobile/.env` from `apps/mobile/.env.example` and provide only public client configuration.

```sh
cd apps/mobile
npm install
npx expo start --web
```

## Production backend

The production backend is containerized with the root-level `Dockerfile` and uses Python 3.12.

Build locally with Docker:

```sh
docker build -t medinsight-backend:local .
docker run --rm -p 8000:8000 -e PORT=8000 medinsight-backend:local
```

The production image installs:

```text
tesseract-ocr
tesseract-ocr-eng
```

Runtime secrets and database configuration are supplied as environment variables and are not copied into the image.

## Database migrations

Alembic is the production schema authority.

```sh
python -m alembic -c backend/alembic.ini upgrade head
```

The current migration chain includes ownership and manual-measurement support. Production PostgreSQL startup does not silently fall back to SQLite or call `create_all`.

## Important limitations

MedInsight is a software project, not a medical device.

Current limitations include:

- The deterministic parser supports a curated set of biomarkers and common report structures, not every laboratory format.
- OCR can fail on poor-quality scans or unusual layouts.
- No unit conversion is performed.
- Manual measurement editing is currently delete-and-readd.
- AI explanations can contain errors and remain optional educational context.
- Public account-confirmation email delivery is still being configured for unrestricted signup.
- Native Android, iOS, and Windows installers are not released yet.
- The free backend deployment can have a cold-start delay after inactivity.

## Medical disclaimer

MedInsight is intended for organizing and explaining laboratory data for educational and personal-record purposes. It is not a diagnostic system and does not replace professional medical advice, diagnosis, treatment, or emergency care.

## Project status

The web application and production backend are deployed and functional. Current work is focused on deployment polish, public account-email delivery, final portfolio documentation, and future installable client builds.
