# Security Policy

MedInsight is a portfolio/public-beta health-record application. Security and privacy defects are treated as high-priority engineering issues, but the project is not a certified medical device or a claim of regulatory compliance.

## Supported code

Security fixes are applied to the default `main` branch. Deployment-specific secrets and credentials are managed outside the repository.

## Reporting a vulnerability

Do not open a public issue containing API keys, access tokens, patient information, database credentials, or exploit details that would expose user data.

When reporting a suspected vulnerability, include only the minimum information needed to reproduce the issue. Never attach real patient reports. Synthetic test data is preferred.

## Security boundaries

MedInsight uses:

- Supabase Auth for user identity;
- FastAPI JWT verification and user-scoped queries;
- PostgreSQL Row Level Security as defense in depth;
- server-only credentials for database, Groq, and Supabase administrative operations;
- bounded report upload/OCR processing;
- authenticated rate limits for destructive, expensive, and external-provider operations;
- privacy-minimized structured security audit events;
- no intentional persistent storage of original uploaded PDFs or full extracted/OCR text;
- explicit CORS origins and API no-store/security headers.

The current in-memory rate limiter is process-local and is appropriate for the current single-instance public-beta backend. It must be replaced with a shared limiter before horizontally scaling the API.

## Secrets

Never commit production `.env` files, database URLs containing credentials, Supabase secret/service-role credentials, Groq keys, signing keys, access tokens, SMTP credentials, or real medical reports.

Public/publishable frontend configuration is not treated as a server secret, but privileged Supabase secret keys must never be placed in an `EXPO_PUBLIC_*` variable.

## Dependency findings

Known upstream dependency findings should be tracked explicitly instead of hidden or remediated through breaking forced upgrades. See repository issues for active dependency-security tracking.

## Privacy

See [PRIVACY.md](PRIVACY.md) for the current data-retention and provider model, and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for the engineering threat model.
