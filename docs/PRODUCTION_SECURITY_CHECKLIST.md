# Production Security Checklist

This checklist separates verified code controls from provider/account settings that must be confirmed before MedInsight is treated as more than a portfolio/public-beta application.

Last reviewed: 2026-08-21.

## Application validation

- [x] Backend CI passes on the release candidate (`171 passed, 2 skipped, 31 subtests passed`).
- [x] Frontend TypeScript check passes.
- [x] Expo web export succeeds.
- [x] Health-data deletion was smoke-tested with a disposable account.
- [x] Automated ownership regression tests cover cross-user report/measurement mutation boundaries.
- [x] Individual manual and report-derived measurement management is implemented with ownership checks.
- [x] Individual report rename/delete is implemented; report deletion cascades only to measurements extracted from that report.
- [x] Password-change UI is implemented with current-password verification through Supabase Auth.
- [x] Destructive/expensive endpoints have bounded rate limits and return HTTP 429 with `Retry-After` when limits are exceeded.
- [x] Security logging is designed not to include emails, bearer tokens, report filenames, biomarker values, or document text.
- [ ] Final live smoke test after the latest Render deployment: edit/delete manual measurement, correct/delete report-derived measurement, rename/delete report, change password, delete health data, delete account.

## Supabase

- [x] Project is active in `eu-west-2` (London).
- [x] RLS remains enabled on health-data tables and ownership policies have been reviewed after schema changes.
- [x] `public.alembic_version` has RLS enabled with intentionally no user policy; the Supabase advisor reports this only as informational.
- [x] Persisted report source-line excerpts were scrubbed and new processing does not retain them.
- [x] Production schema includes the report-correction provenance field used by the current application.
- [x] `SUPABASE_SECRET_KEY` is backend-only configuration.
- [ ] Confirm no secret/service-role key exists in the Render static-site/frontend environment.
- [ ] Document Supabase backup behavior and how deletion propagates to provider backups.
- [ ] Review Auth/database log retention and minimize it where the Free plan permits.
- [ ] Confirm administrative Supabase access uses strong account security.
- [ ] Re-run disposable account deletion and confirm the identity disappears from Auth users after the latest deployment.

### Known Supabase advisor note

Supabase currently warns that leaked-password protection is disabled. That control is not available on the selected Free plan. Compensating controls are minimum password requirements, current-password verification for password changes, and normal Supabase session handling. Do not claim leaked-password screening is enabled.

## Render

- [x] Backend and frontend are served over HTTPS endpoints.
- [x] Backend application design does not rely on local persistent files for uploaded reports.
- [x] Render Free/Hobby application-log retention is documented as 7 days.
- [x] Static sites do not emit Render runtime logs.
- [x] Free web-service cold-start behavior is documented: services can spin down after 15 minutes without inbound traffic.
- [x] Render Free service filesystems are ephemeral; this is compatible with transient PDF processing.
- [ ] In the backend service dashboard, verify only required production secrets are present.
- [ ] In the static frontend dashboard, verify only public `EXPO_PUBLIC_*` configuration is present.
- [ ] Confirm `MEDINSIGHT_CORS_ORIGINS` contains the exact deployed frontend origin and no wildcard.
- [ ] Inspect recent backend logs and verify no request bodies, bearer tokens, report text, filenames, or biomarker values are present.
- [ ] Confirm the backend service region in the Render dashboard and document the cross-region path to Supabase `eu-west-2` if they differ.
- [ ] Keep the deployment classified as portfolio/public-beta while using Render Free; Render explicitly does not recommend Free instances for production applications.

## Groq

- [x] `GROQ_API_KEY` is read only by the backend.
- [x] AI explanation context is allowlisted and privacy-minimized.
- [x] MedInsight uses synchronous inference and explicitly sets `store=False`.
- [x] MedInsight does not use Groq batch or fine-tuning endpoints for biomarker explanations.
- [x] Current Groq data terms reviewed: inference customer data is not retained by default, but inputs/outputs may be temporarily logged for reliability/abuse investigation for up to 30 days unless Zero Data Retention is enabled.
- [x] Current Groq documentation states customer inputs/outputs are not used for model training/fine-tuning without explicit permission/instruction.
- [x] Groq documents retained customer data as located in GCP buckets in the United States; this is an international-transfer consideration for European health data.
- [ ] In Groq Console → Data Controls, enable **Zero Data Retention (ZDR)** for the organization if available to the account.
- [ ] Keep batch/fine-tuning persistence features disabled for the MedInsight organization unless a future reviewed feature requires them.
- [ ] Document a Groq API-key rotation procedure and rotate immediately if exposure is suspected.

## Email / signup

- [ ] Custom SMTP is configured for unrestricted public signup.
- [ ] Confirmation email works with a brand-new disposable address.
- [ ] SMTP credentials are stored only in the email provider/Supabase configuration, never in GitHub or Expo variables.
- [ ] Email-provider log and retention behavior is reviewed.

## Repository and supply chain

- [x] GitHub Actions validates backend tests, frontend TypeScript, and Expo web export.
- [x] Dependabot configuration exists for Python and npm dependencies.
- [x] Known Expo/Metro transitive audit findings are tracked rather than force-fixed with a breaking downgrade.
- [ ] **Protect `main`.** Current GitHub API state reports `protected: false` and required-status-check enforcement `off`.
- [ ] Require pull requests before merging to `main`.
- [ ] Require both CI jobs: **Backend tests** and **Frontend typecheck and export**.
- [ ] Require branches to be up to date before merge.
- [ ] Block force pushes and branch deletion on `main`.
- [ ] Enable GitHub secret scanning / push protection where available for the repository/account.

## Portfolio screenshots

- [ ] Use a disposable authenticated demo account containing **synthetic data only**.
- [ ] Capture the real deployed dashboard/overview.
- [ ] Capture Reports with rename/delete controls visible.
- [ ] Capture Biomarker History with measurement edit/delete and a user-corrected report value visible.
- [ ] Capture Settings with Change password and Data & Privacy controls visible.
- [ ] Check every image for emails, real names, tokens, provider IDs, or real medical data before committing it.
- [ ] Store approved images under `docs/screenshots/` and reference them from the README.
- [ ] Do not use generated concept mockups as if they were screenshots of the shipped application.

## Privacy / legal readiness for real health data

- [ ] Public privacy notice names the operator/data controller and contact route.
- [ ] Processing purpose, lawful basis, and special-category health-data basis are reviewed with qualified legal/privacy advice.
- [ ] Processor/subprocessor agreements and international-transfer arrangements are reviewed, including Groq's US data location.
- [ ] Data-subject access/export procedures are documented in addition to correction/deletion controls already implemented.
- [ ] Retention schedule is documented for application data, provider backups, and logs.
- [ ] DPIA/risk-assessment requirement is evaluated.
- [ ] The application is not marketed as clinically certified unless the relevant regulatory work has actually been completed.

## Scaling gate

Before more than one backend instance is deployed:

- [ ] Replace the process-local rate limiter with a shared datastore-backed limiter.
- [ ] Re-test destructive-operation and AI rate limits across multiple replicas.
