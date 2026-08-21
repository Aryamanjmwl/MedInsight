# Production Security Checklist

This checklist separates code controls from provider/account settings that must be verified manually before MedInsight is treated as more than a portfolio/public-beta application.

## Application validation

- [ ] Backend tests pass on `main`.
- [ ] Frontend TypeScript check passes.
- [ ] Expo web export succeeds.
- [ ] Production health endpoint responds over HTTPS.
- [ ] Cross-user isolation smoke test passes with two disposable users.
- [ ] `Delete health data` removes only the active user's MedInsight records.
- [ ] `Delete account` removes health data and the disposable Supabase Auth identity.
- [ ] Rate-limited endpoints return HTTP 429 with `Retry-After` when intentionally exercised in a test environment.
- [ ] Security logs contain no email addresses, access tokens, report filenames, biomarker names, biomarker values, or document text.

## Supabase

- [ ] Project region is documented and appropriate for intended users.
- [ ] RLS remains enabled and ownership policies are reviewed after schema changes.
- [ ] `SUPABASE_SECRET_KEY` exists only on the trusted backend service.
- [ ] No service-role/secret key exists in Expo/static-site environment variables.
- [ ] Backup behavior and deletion persistence in backups are documented.
- [ ] Auth and database log-retention settings are reviewed and minimized where configurable.
- [ ] Administrative access is limited to required maintainers and protected with strong account security.
- [ ] Disposable account-deletion test confirms the identity disappears from Auth users.

## Render

- [ ] Backend and frontend use HTTPS public endpoints.
- [ ] Backend environment contains only required production secrets.
- [ ] Static frontend environment contains public configuration only.
- [ ] `MEDINSIGHT_CORS_ORIGINS` lists exact deployed frontend origins; no wildcard.
- [ ] Deploy/runtime logs are checked to ensure request bodies, bearer tokens, and report content are not logged.
- [ ] Log-retention behavior is documented.
- [ ] Region and data-transfer implications are documented.

## Groq

- [ ] `GROQ_API_KEY` exists only on the backend.
- [ ] AI explanation context remains allowlisted and privacy-minimized.
- [ ] Provider data controls and current retention terms are reviewed before real-user use.
- [ ] Key rotation procedure is documented.

## Email / signup

- [ ] Custom SMTP is configured for unrestricted public signup.
- [ ] Confirmation email works with a brand-new disposable address.
- [ ] SMTP credentials are stored only in the provider/Supabase configuration, never in GitHub or Expo variables.
- [ ] Email-provider log and retention behavior is reviewed.

## Repository and supply chain

- [ ] GitHub secret scanning / push protection is enabled where available.
- [ ] Dependabot alerts are reviewed.
- [ ] Known Expo/Metro transitive findings remain tracked until an upstream-compatible remediation exists.
- [ ] No `npm audit fix --force` or equivalent breaking security downgrade is applied without a reviewed migration.
- [ ] Branch protection is enabled on `main` once CI is stable.
- [ ] Pull requests require successful CI before merge.

## Privacy / legal readiness for real health data

- [ ] Public privacy notice names the operator/data controller and contact route.
- [ ] Processing purpose, lawful basis, and special-category health-data basis are reviewed with qualified legal/privacy advice.
- [ ] Processor/subprocessor agreements and international-transfer arrangements are reviewed.
- [ ] Data-subject access, correction, export, and deletion procedures are documented.
- [ ] Retention schedule is documented for application data, backups, and logs.
- [ ] DPIA/risk-assessment requirement is evaluated.
- [ ] The application is not marketed as clinically certified unless the relevant regulatory work has actually been completed.

## Scaling gate

Before more than one backend instance is deployed:

- [ ] Replace the process-local rate limiter with a shared datastore-backed limiter.
- [ ] Re-test destructive-operation and AI rate limits across multiple replicas.
