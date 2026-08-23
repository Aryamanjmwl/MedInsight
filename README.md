# MedInsight

MedInsight is a privacy-conscious health record application that turns laboratory reports into structured, longitudinal health information.

It combines deterministic lab-value extraction and classification with timeline-based tracking, manual measurement entry, report management, doctor-visit summaries, and bounded AI explanations for individual biomarkers.

> **Live web app:** https://medinsight-web.onrender.com  
> **Backend API:** https://medinsight-1sne.onrender.com  
> **Status:** Public portfolio / beta deployment. Native Android, iOS, and Windows installers are not released yet.

## What MedInsight does

MedInsight is designed to help a user organize laboratory results over time instead of treating every PDF as an isolated document.

Core capabilities include:

- Uploading machine-readable or scanned laboratory PDFs
- Deterministic extraction of supported biomarkers, values, units, and report-provided reference ranges
- Low / normal / high classification using only the reference information supplied by the report
- Longitudinal biomarker history and mathematical trend views
- Manual entry of individual laboratory measurements without creating a fake report
- Editing or deleting individual saved measurements
- Correcting report-derived structured measurements while preserving report provenance and marking the value as user-corrected
- Renaming or deleting individual saved report records
- A deterministic doctor-visit brief built from saved structured results
- Optional AI explanations for a single biomarker using a privacy-minimized structured context
- Email/password authentication, password changes, per-user data isolation, health-data deletion, and account deletion

MedInsight does **not** diagnose disease, assign clinical severity, recommend medication, or invent medical reference ranges.

## Using the live application

The normal way to use MedInsight is through the deployed web application, not by running code from GitHub.

1. Open **https://medinsight-web.onrender.com**.
2. Sign in with a MedInsight account.
3. Upload a laboratory PDF from **Reports**, or add an individual value with **Add measurement**.
4. Review the dashboard for current measurements, items outside their supplied reference ranges, and recent history.
5. Open **Biomarkers** to inspect measurement history and deterministic trends.
6. Edit or delete an individual measurement when a saved structured value needs correction.
7. Open **Reports** to rename or delete an individual saved report record.
8. Use **Explain this result** for a bounded educational explanation of one saved biomarker.
9. Open **Doctor Brief** for a deterministic summary intended to help prepare for a healthcare appointment.
10. Use **Settings** to change the account password, delete health data, or delete the account.

Public signup depends on the configured transactional-email provider. Confirmation email should be verified with a brand-new disposable address before treating signup as release-ready.

### Free-hosting behavior

The current backend is deployed on Render's free service tier. Free web services can spin down after 15 minutes without inbound traffic and may take roughly a minute to wake on the next request. The service filesystem is ephemeral, which is compatible with MedInsight's design because uploaded PDFs are processed transiently rather than retained as application files.

## Application availability

The repository contains a cross-platform Expo client, but the currently released user-facing version is the **web application**.

| Platform | Current status | How to use it |
| --- | --- | --- |
| Web | Live beta | Open https://medinsight-web.onrender.com |
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
- OpenAI-compatible Python SDK
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

## Measurement and report management

Manual and report-derived measurements share the same longitudinal biomarker history while preserving their provenance.

Manual measurements have their own measurement date and owner and do not create artificial report records. Reference information is optional. If a reference is supplied, MedInsight reuses its deterministic classifier; if no reference is supplied, the measurement remains **Not classified**.

Owners can edit or delete individual saved measurements. Editing recalculates status server-side from the stored value and supplied reference information. Report-derived measurements keep their report association and date when corrected and are marked as **user corrected** so the application does not pretend that the modified structured value was the original PDF value.

Saved report records can be renamed or deleted. Deleting a report cascades to measurements extracted from that report while leaving unrelated manual measurements untouched. MedInsight does not retain the original PDF bytes, so it does not claim to modify an uploaded document after processing.

## Trends and dashboard

The dashboard and biomarker history use the effective measurement date:

- report-derived results use the stored report/upload timestamp
- manual measurements use their explicit measurement date

Trends are calculated only across comparable units. Mixed-unit histories are intentionally treated as non-comparable rather than converted automatically.

## Doctor Visit Brief

`GET /dashboard/doctor-brief` creates an on-demand deterministic summary from the authenticated user's structured record.

It can include recent reports, latest biomarker measurements, latest values outside supplied reference ranges, comparable deterministic changes over time, measurements without usable reference information, and a small set of factual questions to discuss with a healthcare professional.

The brief does not use AI and is not persisted.

## AI biomarker explanations

MedInsight offers an optional educational explanation for a single saved biomarker through:

```text
POST /biomarkers/{normalized_name}/explain
```

The deterministic parser, report-provided reference data, stored value, status, date, and trend remain the source of truth.

Only an allowlisted structured biomarker context is sent to Groq. MedInsight does not send the raw PDF, OCR image, complete report text, filename, user email, user ID, report ID, or unrelated health history to the AI provider.

The backend uses synchronous Groq inference and explicitly requests `store=False`. It does not use Groq batch or fine-tuning endpoints for this feature. If the provider is unavailable, deterministic MedInsight features continue to work and only the optional explanation feature is affected.

AI explanations are educational and can contain errors. They are not diagnoses or treatment recommendations.

## Authentication and data ownership

MedInsight uses Supabase Auth with email/password sessions.

The backend verifies access tokens against the Supabase JWKS endpoint and validates signature, issuer, audience, expiration, issued-at time, and subject. Protected health-data endpoints require authentication; `/` and `/health` remain public.

Every persisted report and biomarker measurement is associated with the authenticated user's UUID. Report, biomarker, history, trend, dashboard, doctor-brief, mutation, and AI-explanation queries apply user ownership at the database query boundary.

PostgreSQL Row Level Security is enabled as defense in depth. Application-level ownership checks remain mandatory because privileged server roles can bypass RLS.

## Privacy and security principles

- Raw uploaded reports are processed transiently and are not stored as permanent application files.
- Complete extracted/OCR report text is not persisted.
- Previously persisted parser source-line excerpts were scrubbed and new processing does not store them.
- AI receives only a bounded structured context for the selected biomarker.
- Database credentials and provider secrets remain server-side.
- The Expo client uses only public Supabase configuration.
- Real `.env` files are ignored by Git.
- Destructive and expensive operations are rate-limited.
- Security events are logged without report content, biomarker values, emails, tokens, or document text.
- Unknown or ambiguous medical data is rejected or left unclassified instead of guessed.

See [`PRIVACY.md`](PRIVACY.md), [`SECURITY.md`](SECURITY.md), [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md), and [`docs/PRODUCTION_SECURITY_CHECKLIST.md`](docs/PRODUCTION_SECURITY_CHECKLIST.md).

## Repository security

Only example environment files belong in source control. Never commit production database URLs, Supabase database passwords, Supabase secret/service-role keys, `GROQ_API_KEY`, private certificates/signing keys, or real patient reports.

GitHub Actions validates backend tests, frontend TypeScript, and the Expo static web export. Dependabot tracks Python and npm dependencies. Known upstream Expo/Metro audit findings are tracked rather than force-fixed with a breaking downgrade.

`main` should be protected with required CI checks before the first tagged release. See [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md).

## Running locally

### Backend

```sh
git clone https://github.com/Aryamanjmwl/MedInsight.git
cd MedInsight
python -m venv backend/.venv
python -m pip install -r backend/requirements.txt
python -m alembic -c backend/alembic.ini upgrade head
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --env-file backend/.env
```

Create `backend/.env` from `backend/.env.example` and provide only local/development values.

### Frontend

```sh
cd apps/mobile
npm install
npx expo start --web
```

Create `apps/mobile/.env` from `apps/mobile/.env.example` and provide only public client configuration.

## Production backend

The production backend is containerized with the root-level `Dockerfile` and uses Python 3.12. Tesseract English OCR is installed in the image. Runtime secrets and database configuration are supplied as environment variables and are not copied into the image.

Alembic is the production schema authority. The migration chain covers initial persistence, user ownership/RLS, manual measurements, report-text minimization, and correction provenance for user-edited report-derived values.

## Screenshots

Portfolio screenshots must come from the real deployed UI using **synthetic laboratory data only**. Generated concept mockups are intentionally not presented as product screenshots because they can contain features or layouts that are not part of the shipped application.

The first tagged release should include four authenticated screenshots: dashboard, reports/report management, biomarker history with edit/delete controls, and settings/account security. The capture checklist is documented in [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md).

## Important limitations

MedInsight is a software project, not a medical device.

Current limitations include:

- The deterministic parser supports a curated set of biomarkers and common report structures, not every laboratory format.
- OCR can fail on poor-quality scans or unusual layouts.
- No unit conversion is performed.
- AI explanations can contain errors and remain optional educational context.
- Native Android, iOS, and Windows installers are not released yet.
- The free backend deployment can have a cold-start delay after inactivity.
- Render Free/Hobby hosting is appropriate for a portfolio/beta deployment, not a production clinical service.
- Legal, regulatory, processor-contract, and data-transfer review remains necessary before real-world health-data deployment beyond a portfolio/beta context.

## Medical disclaimer

MedInsight is intended for organizing and explaining laboratory data for educational and personal-record purposes. It is not a diagnostic system and does not replace professional medical advice, diagnosis, treatment, or emergency care.

## Project status

The web application and backend are deployed. Core record management, authentication, deletion controls, deterministic processing, OCR, longitudinal tracking, and bounded AI explanations are implemented. The remaining release gates are provider/account configuration checks, protected-branch enforcement, final production smoke testing, and authenticated screenshots from a synthetic demo account.
