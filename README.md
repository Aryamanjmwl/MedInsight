# MedInsight

MedInsight is a cross-platform health intelligence application for transforming laboratory reports into structured, understandable, and longitudinal health information.

The project is being developed as a full-stack AI healthcare system with a Python backend and installable client applications.

## Status

MedInsight is currently under active development.

## Backend production runtime

Run migrations and start the API from the repository root. A normal Linux host
can use Python 3.12 and these commands after installing `backend/requirements.txt`:

```sh
python -m alembic -c backend/alembic.ini upgrade head
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port "$PORT"
```

Production requires a PostgreSQL `DATABASE_URL`, `SUPABASE_URL`, and an explicit
comma-separated `MEDINSIGHT_CORS_ORIGINS` allowlist for browser clients.
`SUPABASE_JWT_AUDIENCE` defaults to `authenticated`. AI explanations optionally
use server-only `OPENAI_API_KEY` and `MEDINSIGHT_AI_MODEL` values.

OCR requires the Linux system packages `tesseract-ocr` and
`tesseract-ocr-eng`. The executable is resolved from `PATH` by default;
`MEDINSIGHT_TESSERACT_CMD` remains available for an explicit Linux or Windows
path. No local persistent filesystem is required when PostgreSQL is configured.

Build and run the production backend image locally with:

```sh
docker build -t medinsight-backend:local .
docker run --rm -p 8000:8000 -e PORT=8000 medinsight-backend:local
```

The image includes Tesseract and its English language data. Runtime secrets and
database configuration must be supplied as environment variables, not build
arguments or image files.

## Backend CORS configuration

The backend permits the current Expo Web development origins by default:
`http://localhost:8081` and `http://127.0.0.1:8081`.

Set `MEDINSIGHT_CORS_ORIGINS` to a comma-separated list to replace those local
defaults, for example:

```powershell
$env:MEDINSIGHT_CORS_ORIGINS="http://localhost:8081,http://127.0.0.1:8081"
```

Production deployments should explicitly provide their actual frontend origins.
Wildcard origins are intentionally not enabled.

## Authentication and data ownership

MedInsight uses Supabase Auth email/password sessions. The Expo client needs only
the public project URL and public anon/publishable key shown in
`apps/mobile/.env.example`; a Supabase service-role key must never be placed in
the client. Native sessions are persisted with Expo SecureStore and web sessions
use browser storage. Backend API requests attach the current access token as a
Bearer token.

The backend verifies access tokens cryptographically against the Supabase JWKS
endpoint derived from `SUPABASE_URL`. It requires a valid signature, expiration,
issuer, audience (`authenticated` by default), issued-at time, and UUID subject.
It does not decode unverified claims or call Supabase once per request; signing
keys are cached and refreshed by the JWT library when needed. Missing tokens and
invalid or expired tokens return HTTP 401. `/` and `/health` remain public;
report processing and all persisted health-data endpoints require authentication.

Every newly saved report and manual measurement receives the authenticated
user's UUID. All report, biomarker, history, trend, dashboard, doctor-brief, and
AI-explanation queries filter by that owner at the database query boundary.
Report-derived biomarker rows receive their report owner's UUID; manual rows
receive the authenticated owner directly. Looking up another user's data uses
the same not-found behavior as missing data. AI context is built only after the
scoped lookup.

## Database migrations and Supabase RLS

Alembic is the production schema authority. For a clean database, run from the
repository root:

```powershell
backend\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
```

The local SQLite convenience startup may create missing tables for development;
non-SQLite startup never calls `create_all`. For a pre-authentication database
whose current tables already exist, first make a backup, then mark that schema
as the baseline and apply ownership:

```powershell
backend\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini stamp 0001_initial_schema
backend\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
```

Legacy rows intentionally retain `user_id = NULL` and are invisible to every
application user. They are not assigned automatically; any later ownership
recovery must be an explicit, audited administrative migration backed by real
identity evidence. Application-created rows always have an owner even though
the transition column remains nullable to preserve quarantined legacy rows.

On PostgreSQL, the ownership migrations enable RLS and create `authenticated`
policies for reports and directly owned biomarker rows using `auth.uid()`. These
policies protect direct Supabase access. FastAPI still applies ownership filters
because privileged server database roles can bypass RLS; RLS is defense in depth.
Indexes cover report ownership/date, report-linked biomarker lookups, and
user/biomarker measurement chronology.

## PDF text extraction and OCR

Machine-readable PDFs are extracted directly with `pypdf`. When that produces
insufficient text, the backend renders the PDF one page at a time with PDFium
and runs local Tesseract OCR. No cloud OCR or external medical-data service is
used. OCR is synchronous, limited to 25 pages, rendered at 250 DPI, and has a
30-second timeout per page.

Tesseract is a separate system dependency and is not bundled in this repository.
For Windows development, install a current Tesseract 5 build referenced by the
[Tesseract installation documentation](https://tesseract-ocr.github.io/tessdoc/Installation.html),
ensure the English language data is installed, and verify it with:

```powershell
tesseract --version
```

If the executable is not on `PATH`, configure its full path for the backend
process without committing the machine-specific value:

```powershell
$env:MEDINSIGHT_TESSERACT_CMD="C:\Program Files\Tesseract-OCR\tesseract.exe"
```

If OCR is required but unavailable, report processing returns HTTP 503.
Unreadable/corrupt PDFs, OCR runtime failures, and scans over the page limit
return HTTP 422. `requires_ocr` continues to describe the source PDF; the
additive `ocr_used` response field reports whether OCR actually ran. Raw PDFs,
page images, and full extracted/OCR text are not persisted. OCR quality depends
on scan resolution, orientation, contrast, layout, and installed language data;
it does not imply diagnostic accuracy.

## Deterministic biomarker extraction

MedInsight uses format-tolerant deterministic extraction for common laboratory
report layouts and preserves source evidence for every extracted measurement.
The parser recognizes a curated vocabulary of 36 common biomarkers through
explicit aliases, then handles common single-line, whitespace/pipe table,
dot-leader, and short multi-line layouts. It supports decimal points and decimal
commas, carefully constrained thousands grouping, common laboratory units, and
report-supplied ranges or comparison thresholds.

Units are normalized only when their spelling is safely equivalent; values are
not converted between units. A measurement without a usable printed reference
is retained with an `unknown` status. Missing units, ambiguous numbers, unknown
analytes, and uncertain layouts are rejected instead of guessed. This bounded
parser improves coverage of common formats but does not claim to support every
laboratory, analyte, or report layout. Not every possible laboratory format or
analyte is guaranteed to be recognized.

## AI biomarker explanations

MedInsight can generate a compact educational explanation for one saved
biomarker through `POST /biomarkers/{normalized_name}/explain`. The deterministic
parser, report-provided reference data, status classification, dates, and trend
engine remain the source of truth. The AI receives only an allowlisted structured
payload for that biomarker; it does not receive the filename, report ID,
`source_text`, extracted report text, OCR images, or raw PDF bytes, and it does
not calculate status or reference ranges.

The backend uses the official OpenAI Python SDK and Responses API with validated
structured output. Configure the server process—not the Expo client—with:

```powershell
$env:OPENAI_API_KEY="your-server-side-key"
$env:MEDINSIGHT_AI_MODEL="gpt-5.6"
```

`MEDINSIGHT_AI_MODEL` defaults to `gpt-5.6`. If `OPENAI_API_KEY` is absent, all
deterministic features remain available and only the explanation endpoint
returns HTTP 503. Never place the key in an `EXPO_PUBLIC_*` variable or commit it
to an environment file.

Explanation requests use `store=False`, and MedInsight does not persist prompts,
responses, or token usage in its database or client storage. This setting does
not imply zero retention: OpenAI still processes request data under its
[API data controls and retention policies](https://developers.openai.com/api/docs/guides/your-data).
AI explanation history is user-scoped before any provider call is made.

AI explanations are educational, not diagnostic, and do not provide treatment
or medication advice. Generative responses can contain errors and should be
interpreted with the user's overall medical history and a healthcare
professional. This first version combines the structured result with cautious
general model knowledge; curated internal reference notes are a possible later
grounding enhancement. The implementation uses the
[Responses API structured-output interface](https://developers.openai.com/api/docs/guides/structured-outputs)
and does not provide chat, report-wide reasoning, web browsing, agents, or a
vector database.

## Doctor Visit Brief

`GET /dashboard/doctor-brief` generates a concise appointment-preparation brief
on demand from the current persisted structured lab record. It includes up to
five recent reports, each biomarker's latest measurement, latest results outside
their report-provided range, comparable deterministic changes over time,
measurements without usable reference information, and up to five factual
questions to discuss with a healthcare professional.

The brief does not use AI, diagnose conditions, assign severity, invent
reference ranges, or recommend treatments or medication changes. It excludes
filenames, source text, PDF/OCR content, and AI explanation history. Briefs and
generated questions are not persisted. The brief is assembled exclusively from
the authenticated user's saved reports.
