# AICTE SmartVerify

AICTE SmartVerify is a transparent, end-to-end institutional application validation, public grievance intake, and government complaint-monitoring demonstration. It is designed for a college or hackathon evaluation with fictional records, a deterministic validation engine, evidence-linked findings, role-aware workflows, audit history, overlap detection, and clearly labelled simulated issuer responses.

> **DEMO ENVIRONMENT — SYNTHETIC DATA — NOT AN OFFICIAL AICTE SYSTEM.**

## Run locally

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install
cp .env.example .env
pnpm seed
pnpm dev
```

Open `http://localhost:3000`. The managed Preview uses the same port. The schema is created idempotently in `data/smartverify.db`; uploads are kept under `data/uploads/`. Use `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test` for checks.

## Demo walkthrough

1. As an officer, open the dedicated **Government dashboard** at `/government` to see the review command center and five fictional applications: clean, missing documents, expired certificate, institutional programme/intake mismatch, and duplicate/inconsistent evidence. Switch the demo session to **Institution Applicant** to use the separate **Institution dashboard** at `/institution`, which shows only the assigned institution’s applications, document count, open findings, rectification actions, and workflow guidance.
2. Open **Applications → New application**, create a draft, then open its detail page. The server validates required fields and writes an audit entry. Applicant users can access only their assigned applications and can submit or save drafts, while officer-only validation, issuer verification, and official review actions stay restricted.
3. From **Documents** or the application’s **Documents** tab, upload a `.txt` fixture or a supported PDF/image. The server checks type and size, stores the original, calculates SHA-256, classifies the evidence, extracts fields and dates where supported, and records confidence/page evidence.
4. Run **Validation** on an application. Review missing-document, expiry, record-mismatch, and potential-duplicate findings. Each finding shows evidence, detection method, confidence, and a human next step; no finding asserts forgery or misconduct.
5. Use **Issuer verification** or the detail tab to run `verified`, `mismatch`, `expired`, `pending`, `unavailable`, or `manual_review`. Every result is marked `SIMULATED`, includes provenance, and states that no official source was contacted.
6. A reviewer can acknowledge or resolve findings. Use **Officer review** to record an explicit workflow action; automated checks never grant or reject approval.
7. Use **Regulatory rules** as an administrator to create a versioned, effective-dated rule record. **Audit trail** shows the actor, role, action, entity, before/after values, metadata, timestamps, validation-rule context, verification events, and exports.
8. Use **Reports & exports** to download JSON, CSV, or a concise PDF report. The report carries the synthetic-data and simulated-verification notice.
9. Open the public portal at `/public` or select **Public Grievance Portal** from Login. A student, faculty member, institution, or stakeholder can submit a complaint, receive a case reference/access code, and track a case with the reference plus submission email. Public tracking hides complainant details, officer notes, and unrestricted related-case data.
10. As a government officer, open **Complaint monitoring** from the Government workspace. Review pending, under-process, disposed, transferred, escalated, overdue, bureau-wise, region-wise, and overlap metrics. Cases such as `AICTE-PGRC-2026-001` and `AICTE-RB-2026-014` intentionally demonstrate the `Potential Overlapping Cases — Coordination Required` alert for one institution.

## Test and smoke commands

The test suite uses a separate database and upload directory so it does not overwrite the development data:

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
curl http://localhost:3000/api/health
curl http://localhost:3000/manus-routes.json
```

Tests cover authentication/role enforcement, application creation, upload restrictions, extraction, missing/expired/mismatch/near-duplicate validation, simulated issuer scenarios, rule versioning, finding review, audit search, JSON/CSV/PDF exports, public complaint submission/tracking/privacy, overlap monitoring, and database cleanup.

## Architecture

Next.js App Router provides the pages and server route handlers. SQLite is used for the self-contained demo; the repository layer is isolated so a production MySQL/PostgreSQL/Prisma adapter can replace it. `src/lib/document-processor.ts` owns upload validation, hashing, extraction, classification, and expiry parsing. `src/lib/repository.ts` owns application CRUD, validation, findings, simulated issuer records, infrastructure observations, audit logs, rules, dashboard aggregates, reports, public complaint cases, action history, and overlap monitoring. `app/public/page.tsx` is the no-login public grievance portal; `app/(console)/government/complaints/page.tsx` is the authorized government monitoring workspace. `public/manus-routes.json` declares the complete page route set for the managed Preview.

## Production integration requirements and limitations

This repository does **not** connect to AICTE systems, government portals, restricted issuer services, real institutional records, or live credentials. The issuer adapter is intentionally simulated and must remain visibly labelled until an official interface, written access permission, supported credentials, source documentation, and independent verification are available. No restricted service is scraped or bypassed.

OCR is dependency-aware. Text PDFs, text fixtures, and metadata are processed in the demo; scanned PDFs and images are retained with an explicit OCR-unavailable limitation when OCR binaries are absent. A production deployment should add a vetted OCR service, malware scanning, encrypted object storage, retention/deletion policies, key management, rate limiting, CSRF protection, secure identity-provider authentication, privacy controls, and a least-privilege database account. The local demo role selector is not production-grade authentication. Image observations remain non-conclusive and do not establish building compliance, capacity, authenticity, or physical condition.

Do not claim AICTE approval, statutory compliance certification, fraud/forgery findings, or official verification based on this demonstration. Competent authorities retain responsibility for statutory scrutiny, inspections, and final decisions.
