# Release Readiness

This document is the release gate for the first tagged MedInsight public-beta release. It distinguishes code that has been validated from provider/account controls that require an owner to confirm in the relevant dashboard.

Last reviewed: 2026-08-21.

## Current candidate

- `main` feature head before this documentation pass: `fcf5780f36ef00475335a1e5bbe04eecadf4104b`
- Backend CI: `171 passed, 2 skipped, 31 subtests passed`
- Frontend TypeScript: passed
- Expo web export: passed
- Production database migration for user-corrected report values: applied
- Supabase security advisor: no health-data RLS error; only informational `alembic_version` no-policy notice plus the Free-plan leaked-password warning

## What is release-ready in code

- Authenticated, user-scoped reports and biomarker history
- Machine-readable PDF extraction and local Tesseract OCR fallback
- Deterministic biomarker parsing/classification with bounded supported coverage
- Manual measurement create/edit/delete
- Report-derived measurement correction/deletion with user-corrected provenance
- Individual report rename/delete with cascade limited to report-derived measurements
- Password change through Supabase Auth with current-password verification
- Health-data deletion and account deletion
- Dashboard, trends, doctor brief, and bounded AI explanations
- Rate limiting, privacy-safe security events, no-store response headers, CI, Dependabot, threat model, privacy/security documentation

## Provider review

### Supabase

The project is active in `eu-west-2` (London). Application health-data tables use user ownership and RLS. The migration bookkeeping table has RLS enabled with no user policy, which is intentional. Leaked-password checking is unavailable on the selected Free plan and must not be claimed as enabled.

Before release, confirm in the dashboard that backend-only secrets are not exposed to the frontend, review backup/log retention behavior, and repeat the disposable account-deletion test.

### Render

Current Render documentation for the Free/Hobby deployment states:

- application logs are retained for 7 days on Hobby workspaces;
- static sites do not emit Render runtime logs;
- Free web services can spin down after 15 minutes without inbound traffic;
- Free web-service filesystems are ephemeral;
- Render explicitly positions Free instances for testing/hobby/preview rather than production applications.

This is acceptable for a portfolio/public-beta deployment but is not a basis for describing MedInsight as a production clinical platform.

Owner checks still required in Render:

1. Backend service → Environment: only required server secrets/configuration.
2. Static frontend → Environment: public values only; no Supabase secret/service-role key and no Groq key.
3. Backend logs: inspect recent entries and verify there are no bearer tokens, request bodies, report text, filenames, or biomarker values.
4. Confirm backend service region and document any cross-region transfer to Supabase London.
5. Confirm `MEDINSIGHT_CORS_ORIGINS` contains the exact frontend origin and no wildcard.

### Groq

Current Groq documentation states that synchronous inference customer data is not retained by default. Inputs/outputs can still be temporarily logged for reliability or abuse investigation for up to 30 days unless Zero Data Retention is enabled. Groq documents customer-data storage in US GCP buckets when retention occurs.

MedInsight reduces this exposure by sending only an allowlisted structured biomarker context and by setting `store=False`. It does not use batch or fine-tuning persistence features for explanations.

Owner check still required:

**Groq Console → Data Controls → enable Zero Data Retention (ZDR)** for the MedInsight organization if the control is available to the account. Keep batch/fine-tuning persistence features disabled unless a future reviewed feature needs them.

## GitHub release gate

The GitHub API currently reports `main` as **not protected** and required-status-check enforcement as **off**.

Before tagging a release, configure a ruleset or branch protection for `main` with:

- require a pull request before merging;
- require status checks before merging;
- require **Backend tests**;
- require **Frontend typecheck and export**;
- require the branch to be up to date before merge;
- block force pushes;
- block branch deletion;
- enable secret scanning / push protection where the account supports it.

The connected GitHub integration used for this review can read branch protection state and modify repository files/PRs, but it does not expose the GitHub branch-ruleset mutation endpoint. This one repository setting therefore requires owner action in GitHub Settings.

## Final live smoke test

Use a disposable account and synthetic data only. A release candidate passes when all of the following succeed after the latest Render deploy:

1. Sign in.
2. Add a manual measurement; edit it; delete it.
3. Upload a synthetic PDF.
4. Correct one report-derived measurement and confirm it is marked **User corrected**.
5. Delete an individual report-derived measurement while retaining the report.
6. Rename the report.
7. Add one unrelated manual measurement, delete the report, and confirm the unrelated manual measurement remains.
8. Change the account password, sign out, verify the old password fails and the new password succeeds.
9. Delete health data; sign out/in; confirm the account remains and health data stays deleted.
10. Add disposable data again; delete the account; confirm the old login no longer works.

## Screenshot gate

Do not use generated design concepts as product screenshots.

Capture four real screenshots from the deployed UI using a disposable account loaded with synthetic reports:

1. **Dashboard** — longitudinal overview with synthetic measurements.
2. **Reports** — a report expanded with Rename and Delete report controls visible.
3. **Biomarker History** — Edit/Delete controls and a user-corrected report-derived value visible.
4. **Settings** — Change password plus Data & Privacy controls.

Before committing each image, inspect it for emails, names, tokens, project IDs, real medical information, or browser/account UI that should not be public. Store approved captures in `docs/screenshots/` and add them to the root README.

## Tagging decision

Do **not** create the first tagged release until all of these are true:

- branch protection/ruleset is enabled;
- Render environment/log/region review is complete;
- Groq ZDR is enabled or an explicit documented decision is made not to enable it;
- public email confirmation works for a brand-new disposable address;
- final live smoke test passes;
- four synthetic-data screenshots are reviewed and committed.

Until then, the accurate project label is **public portfolio / beta deployment**.
