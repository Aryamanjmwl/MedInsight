# MedInsight Privacy and Data Retention

_Last updated: 21 August 2026_

MedInsight is a portfolio/public-beta health-record application. It is designed to minimize the amount of laboratory-report data that is retained and to keep user records separated by authenticated account.

This document describes the behavior of the current MedInsight deployment and source code. It is not a claim of regulatory certification and is not a substitute for a formal legal review before MedInsight is offered as a production medical service.

## Data MedInsight stores

For an authenticated user, MedInsight may retain:

- the Supabase authentication identity needed to sign in;
- report metadata such as filename, upload time, page count, character count, and whether OCR was required;
- structured laboratory measurements such as biomarker name, value, unit, report-supplied reference information, status, and measurement date;
- manually entered laboratory measurements and their provenance.

Each application-created report and measurement is associated with the authenticated user's UUID.

## Data MedInsight does not intentionally retain

The application does not intentionally persist:

- original uploaded PDF files;
- rendered OCR page images;
- the complete extracted or OCR text of a report;
- report source-line excerpts after the structured measurement has been saved;
- AI prompts or AI responses in the MedInsight database;
- Groq API credentials, database passwords, or Supabase secret keys in the client application.

Uploaded report bytes and parser source lines are processed by the backend only for the duration required to extract and validate structured information. The persistence layer stores the structured measurement fields needed by longitudinal product features and intentionally clears the source-text field instead of retaining report text.

A database migration also clears source-text excerpts that may have been stored by earlier MedInsight versions. This removal is intentionally irreversible.

## Why data is processed

Stored data is used to provide the user-requested product features, including longitudinal biomarker history, deterministic status classification, trend views, report summaries, manual measurements, and the Doctor Visit Brief.

MedInsight does not use stored health data for advertising or automated clinical diagnosis.

## Authentication and access control

MedInsight uses Supabase Auth. The frontend sends the current Supabase access token to the FastAPI backend over HTTPS. The backend verifies the token signature, issuer, audience, expiration, issued-at time, and user identifier before protected health-data requests are processed.

Application queries are scoped by the authenticated user's UUID. PostgreSQL Row Level Security is also enabled for owned health-data rows as a defense-in-depth control.

## Cloud services

The current public deployment uses third-party infrastructure:

- **Supabase** for authentication and PostgreSQL data storage;
- **Render** for the public frontend and FastAPI backend runtime;
- **Groq** only when a user explicitly requests an AI explanation for an individual biomarker.

Those providers process data according to their own service terms, security controls, logging, backup, and retention practices. A production operator must review and configure those provider settings appropriately for the jurisdiction and intended use.

## AI explanations

AI is optional and is not used to extract laboratory values, calculate reference ranges, classify a result, or generate the deterministic Doctor Visit Brief.

When a user requests an AI explanation, MedInsight sends only an allowlisted structured context required for that biomarker explanation. The model context excludes the raw report, full extracted/OCR text, filename, report ID, user ID, email address, and unrelated biomarker history.

AI output is educational and may contain errors. It is not a diagnosis or treatment recommendation.

## Retention

Structured report metadata and biomarker measurements are retained until the user deletes their health data or deletes their MedInsight account, unless deletion must be delayed or limited by an infrastructure provider's backup or security-retention process.

MedInsight does not currently implement a separate automatic expiry period for active-account laboratory history because longitudinal history is a core product feature.

Operational infrastructure logs may exist outside the MedInsight application database. Production deployments should configure log retention to the minimum period needed for reliability and security investigations and should avoid logging health-report content, access tokens, or server secrets.

## User deletion controls

MedInsight provides two distinct deletion operations:

1. **Delete health data** permanently removes the user's MedInsight reports and saved biomarker measurements while leaving the authentication account active.
2. **Delete account** permanently removes the user's MedInsight health data and then requests deletion of the user's Supabase authentication account.

Account deletion requires a server-only Supabase secret key. That credential must never be exposed through the Expo/web client or committed to source control.

Deleting a Supabase Auth user invalidates refresh-token based future access, although a previously issued JWT can remain cryptographically valid until its normal expiry. The MedInsight client therefore clears its local session after successful account deletion.

## Security practices

The current design includes, among other controls:

- HTTPS in the hosted deployment;
- server-side JWT verification;
- per-user query scoping;
- PostgreSQL Row Level Security;
- explicit CORS origins rather than a wildcard;
- server-only provider and database credentials;
- no persistent storage of uploaded report files or report source-line excerpts;
- bounded file size and OCR limits;
- deterministic health-data extraction and classification;
- privacy-minimized AI context.

No internet service can promise absolute security. Security issues should be treated as defects and remediated promptly.

## European / GDPR note

Laboratory measurements can constitute health data and may be special-category personal data under European data-protection law. Before accepting real patients as a production service, the operator should complete a formal GDPR/legal review, determine the lawful basis and Article 9 condition for processing, establish controller/processor responsibilities and data-processing agreements, document international transfers where applicable, implement an appropriate data-subject request process, and complete any required risk or impact assessment.

The repository's technical controls support data minimization, access control, and deletion, but they do not by themselves establish legal compliance.

## Changes

Material changes to MedInsight's data handling should be reflected in this document together with the corresponding code or deployment change.
