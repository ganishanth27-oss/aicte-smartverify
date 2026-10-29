# SmartVerify delivery checklist

## 1. Working project foundation and secure demo boundary
- [ ] The project runs as a maintainable Next.js TypeScript application with server-backed route handlers, deterministic setup, environment placeholders, error handling, logs, and an idempotent schema/seed path.
- [ ] Every page shows `DEMO ENVIRONMENT — SYNTHETIC DATA — NOT AN OFFICIAL AICTE SYSTEM.` and the UI does not claim compliance certification or official AICTE integration.
- [ ] Secrets are environment-driven, no API keys or credentials are hard-coded, and production guidance covers secure cookies, TLS, least privilege, retention, CSRF/rate limiting, and object storage.

## 2. Authentication, roles, and authorization
- [ ] Login and logout are implemented with a transparent demo session selector for local evaluation, with server-side role checks for System Administrator, AICTE Officer/Reviewer, Technical Analyst, Institution Applicant, and Read-only Auditor.
- [ ] Institution applicants can only access their own authorized applications; sensitive reads and administrative changes are audited; demo authentication is explicitly non-production.

## 3. Applications and workflow
- [ ] Users can create, view, edit where permitted, search, filter, and track applications with references, fictional institutions/identifiers, categories, sessions, programmes/intake, prior approvals, payment references, reviewers, timestamps, documents, findings, verification, and audit history.
- [ ] Workflow supports Draft → Submitted → Processing → Validation Completed → Rectification Required / Manual Review Required → Officer Review → Decision Pending, with configurable additional statuses/transitions and no automated grant/reject.
- [ ] At least five fictional scenarios exist: clean, missing documents, expired certificate, institutional programme/intake mismatch, and duplicate/inconsistent evidence.

## 4. Document upload and processing
- [ ] Upload accepts safe configurable PDF/PNG/JPG/JPEG/text fixtures, rejects unsafe types and oversized files, preserves originals, records processing status/timestamps, hashes files with SHA-256, and logs the upload.
- [ ] Processing extracts text where available, performs a transparent OCR-unavailable fallback, classifies document type, extracts institution/reference/date/authority/validity/programme fields, preserves confidence/page evidence where available, allows reviewer correction, and detects missing/incomplete/expired/unreadable/misclassified/duplicate evidence.

## 5. Validation and institutional records
- [ ] Validation uses configurable, versioned category rules for required documents/fields, expiry, cross-field/cross-document consistency, record comparisons, checklists, severity, routing, effective dates, and regulation references/change history.
- [ ] Results distinguish missing data, mismatch, inconclusive, and unable-to-check; unavailable records are not treated as non-compliance. Findings are evidence-linked and explainable.

## 6. Issuer verification
- [ ] The provider architecture supports future official APIs/portals/QR/reference/digital signatures/repositories without bypassing authentication or fabricating responses.
- [ ] The demo adapter supports verified, mismatch, expired, pending, source unavailable, and manual review scenarios; every result records source/reference/timestamp/provenance/matched fields/discrepancies/reason, and simulation is visible in UI and exports.

## 7. Findings, infrastructure, and officer review
- [ ] Potential anomalies are phrased as manual-review indicators and show ID, severity, category, evidence/source, page/field, method, explanation, calibrated confidence, next step, comments, and resolution state; no automation-only forgery/fraud assertion is made.
- [ ] Infrastructure evidence can link photos/videos/floor plans/certificates to configurable checklist items with observations, missing-evidence flags, inspection recommendations, and non-conclusive limitations.
- [ ] Authorized reviewers can record observations, resolve findings, transition workflow, and record explicitly non-official demo decisions; all actions are audited.

## 8. Dashboard, audit, reports, rules, and settings
- [ ] Dashboard includes totals, validation/manual-review/missing/expired/inconsistency/issuer/anomaly/officer metrics, recent audit activity, status distribution, and searchable/filterable application table.
- [ ] Audit trail is searchable/filterable, records user/role/action/references/timestamp/rule versions/verification payloads/before-after values/comments/transitions/exports, and is not freely editable.
- [ ] Reports contain summary, rule versions, documents/missing items, extracted fields/confidence, record comparisons, issuer provenance, anomaly/infrastructure evidence, unresolved discrepancies, next steps, officer review, and audit reference; JSON and CSV download/print are available.
- [ ] Authorized administrators can view/version rules and users/roles; settings document storage, OCR, issuer, retention, and integration configuration with official-access requirements.

## 9. Verification and handoff
- [ ] Automated tests cover authentication/authorization, CRUD, upload restrictions, extraction failures, missing/expiry/mismatch/duplicate checks, rule versioning, simulated issuer scenarios, review/audit behavior, exports, and external-service failure handling.
- [ ] README includes install/run, migration/seed, demo walkthrough, test commands, deployment/Docker guidance, and remaining official integration requirements. Build, lint, typecheck, seed, tests, and live endpoint checks pass before handoff.

## 10. Public grievance portal and complaint monitoring
- [ ] A separate no-login public portal allows students, faculty, institutions, stakeholders, and other concerned parties to submit a complaint with complainant contact details, institution name/AICTE Permanent ID, region, category, description, and a generated case reference/access code.
- [ ] The public portal allows exact-match case tracking with the case reference plus contact email, showing safe status, current Bureau/Cell, last action, next action, expected disposal date, timeline, and public overlap/coordination messaging without exposing private officer notes or unrestricted institution histories.
- [ ] Government officers have a separate complaint-monitoring workspace with total, pending, under-process, disposed, transferred, escalated, overdue, bureau/cell, region, status, institution, category, date, and overlap metrics; searchable/filterable cases show assigned officer, action history, remarks, supporting-document indicators, SLA ageing, and coordination alerts.
- [ ] Complaint monitoring detects multiple active RB/PGRC/other Bureau or Cell cases for the same institution, links related cases, labels the alert `Potential Overlapping Cases — Coordination Required`, and never presents synthetic data as an official AICTE record.
- [ ] Complaint APIs validate inputs, preserve chronological action history, seed fictional cases for clean/pending/disposed/transferred/escalated/overlap outcomes, and keep public aggregation separate from authorized government case details.
