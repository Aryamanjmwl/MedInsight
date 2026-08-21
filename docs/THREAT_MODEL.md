# MedInsight Threat Model

_Last reviewed: 21 August 2026_

This threat model documents the current public-beta architecture. It is an engineering artifact, not a legal or regulatory certification.

## Assets to protect

The highest-value assets are:

- authenticated user identities and sessions;
- structured laboratory measurements and report metadata;
- short source-text provenance excerpts;
- database credentials and Supabase administrative credentials;
- Groq API credentials;
- integrity of deterministic classification, trend, and doctor-brief outputs.

Original uploaded report files and complete extracted/OCR report text are intentionally not persisted by the application.

## Trust boundaries

1. **Browser / Expo client** — untrusted from the backend's perspective. Public configuration may exist here; server secrets may not.
2. **FastAPI backend on Render** — trusted application boundary. Validates access tokens, enforces ownership, performs report processing, and calls external providers.
3. **Supabase Auth / PostgreSQL** — cloud identity and persistent structured-data boundary.
4. **Groq** — optional external inference provider receiving only an allowlisted structured biomarker context when explicitly requested.
5. **GitHub / CI** — source and validation boundary. It must not receive runtime secrets or real patient reports.

## Primary threats and controls

### Broken authentication or stolen tokens

**Threat:** an attacker uses a malformed, expired, forged, or stolen bearer token.

**Controls:**
- signature, issuer, audience, expiry, issued-at, and subject validation;
- automatic local sign-out after repeated 401 responses;
- no server secrets in the client;
- authentication failures logged without token contents.

**Residual risk:** a legitimately issued token stolen from a user device can be usable until expiry. Provider/session security remains important.

### IDOR / cross-user health-data access

**Threat:** a user changes a report or measurement identifier to access another user's data.

**Controls:**
- application queries always include the authenticated user UUID;
- RLS policies provide defense in depth for owned rows;
- owner-only manual-measurement deletion;
- user-isolation tests.

### Malicious or oversized report uploads

**Threat:** resource exhaustion, malformed PDFs, decompression/parser abuse, or OCR denial of service.

**Controls:**
- 10 MiB upload limit;
- allowed content-type checks;
- bounded OCR page count and per-page timeout;
- server-side parsing only;
- authenticated report-processing rate limits;
- original files not persisted.

**Residual risk:** third-party PDF/OCR libraries can contain vulnerabilities. Dependencies require ongoing monitoring.

### AI provider abuse or privacy leakage

**Threat:** excessive inference requests, accidental forwarding of sensitive report content, or misleading model output.

**Controls:**
- AI is not used for extraction, status classification, ranges, trends, or doctor brief;
- explicit allowlisted structured context;
- no raw PDF, full extracted text, filename, report ID, email, or user ID sent to the model;
- authenticated AI rate limit;
- structured-output validation;
- provider errors normalized;
- AI security events contain no biomarker name or health value.

### Destructive-operation abuse

**Threat:** repeated or accidental deletion requests.

**Controls:**
- authenticated owner scope;
- two-step frontend confirmation;
- separate health-data and full-account deletion actions;
- server configuration validated before account data is removed;
- rate limits on destructive endpoints;
- privacy-safe deletion audit events.

### Secret leakage

**Threat:** privileged API keys, database URLs, or signing credentials are committed or shipped to the frontend.

**Controls:**
- `.gitignore` / `.dockerignore` secret exclusions;
- backend-only environment variables;
- no privileged key in `EXPO_PUBLIC_*` configuration;
- minimal Docker build context;
- Dependabot and CI validation;
- public repository secret audits should be repeated periodically.

### Sensitive data in logs or caches

**Threat:** report content, tokens, user identity, or medical values appear in logs or browser/proxy caches.

**Controls:**
- security audit events use a pseudonymous user reference;
- audit events intentionally omit email, tokens, report names, biomarker names, and values;
- API responses receive `Cache-Control: no-store` and related security headers;
- full request/response bodies must not be added to application logging.

### Supply-chain compromise

**Threat:** vulnerable or malicious npm/Python dependencies.

**Controls:**
- pinned Python dependencies;
- npm lockfile;
- weekly Dependabot monitoring;
- CI backend tests, TypeScript validation, and Expo web export;
- known Expo/Metro findings tracked rather than hidden by unsafe forced downgrades.

## Scaling assumptions

The current authenticated rate limiter is in-memory and process-local. The current public-beta deployment uses a single backend instance. Before adding multiple backend replicas, the limiter must move to a shared datastore such as Redis or an equivalent managed rate-limit service.

## Operational items requiring provider configuration

Source code cannot by itself guarantee provider-level retention or regional controls. Before accepting real-world patient data, review:

- Supabase project region, backup behavior, log retention, RLS state, and administrative access;
- Render service region, environment access, deploy logs, and log retention;
- Groq account data controls and current retention terms;
- SMTP provider retention and sender configuration;
- secret rotation and offboarding procedures.

See [PRODUCTION_SECURITY_CHECKLIST.md](PRODUCTION_SECURITY_CHECKLIST.md).

## Out of scope for current public beta

- claims of HIPAA, GDPR, MDR, or other regulatory certification;
- clinical diagnosis or treatment decisions;
- universal laboratory-format support;
- storing raw patient-document archives;
- enterprise multi-region high availability.
