# AICTE SmartVerify — implementation plan

## Product scope

SmartVerify is a transparent, demo-ready decision-support application for institutional approval workflows plus a separate public grievance portal and government complaint-monitoring workspace. It never claims official AICTE integration, never labels an upload forged from automation alone, and keeps automated indicators separate from statutory officer decisions. The demo uses fictional records and clearly labelled simulated issuer responses.

## Architecture

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS, responsive dashboard shell with reusable cards, tables, chips, modals, tabs, filters, toast feedback, empty/loading states, and route navigation.
- **Backend:** Next.js Route Handlers under `/api/*`. All mutations pass through server-side validation, role checks, audit logging, and the repository service. API routes expose applications, documents, validation, issuer verification, findings, rules, infrastructure observations, audit events, reports, demo session selection, and public complaint submission/tracking/monitoring.
- **Persistence:** SQLite via `better-sqlite3` for a self-contained demo. The schema is created idempotently at runtime by `src/lib/db.ts` and seeded only when the database is empty. The repository is isolated behind `src/lib/repository.ts` so a production MySQL/PostgreSQL/Prisma adapter can replace it without changing UI contracts.
- **Document pipeline:** uploads are stored under `data/uploads`; MIME/extension/size checks, SHA-256 hashing, text extraction for UTF-8 text and simple PDFs, metadata extraction, expiry parsing, document classification, exact duplicate checks, and transparent simulated OCR fallback are implemented in `src/lib/document-processor.ts`. Original files and processing status remain indexed in SQLite.
- **Validation:** configurable versioned rules in `rules` and `rule_requirements`, with deterministic checks for required documents/fields, expiry, programme/intake mismatches, record comparisons, and duplicate/inconsistent evidence. Findings carry method, evidence, confidence, next step, resolution, and audit references.
- **Verification:** `src/lib/issuer.ts` implements only a clearly labelled simulated adapter with verified, mismatch, expired, pending, unavailable, and manual-review scenarios. No live government source is called.
- **Complaint monitoring:** public cases store institution, region, category, bureau/cell, status, assigned officer, SLA dates, action history, related-case links, and overlap flags. Government APIs expose aggregate workload, ageing, bureau/region/status reports, and coordination alerts; public APIs expose only safe exact-match tracking and aggregate transparency metrics.
- **Reports:** application-wise JSON and CSV exports are generated server-side; a print-friendly report route is available for PDF/browser printing without inventing official verification. Complaint monitoring provides browser-readable institution, bureau, region, status, ageing, and overlap summaries.
- **Testing:** Node's built-in test runner covers repository CRUD, role checks, upload restrictions, extraction, validation, duplicate/expiry/mismatch detection, rule versioning, issuer scenarios, review/audit behavior, exports, and unavailable-provider handling.

## Project structure

```text
app/
  (dashboard)/page.tsx, applications/page.tsx, applications/[id]/page.tsx,
  applications/new/page.tsx, documents/page.tsx, findings/page.tsx,
  verification/page.tsx, rules/page.tsx, infrastructure/page.tsx,
  review/page.tsx, audit/page.tsx, reports/page.tsx, users/page.tsx,
  settings/page.tsx, login/page.tsx, public/page.tsx,
  (console)/government/complaints/page.tsx
  api/**/route.ts                 # server-backed API endpoints
  layout.tsx, globals.css
components/                       # shell, nav, widgets, tables, modal/toast UI
src/lib/                          # schema, repository, validators, processors, auth, audit, reports
scripts/seed.ts                   # deterministic fictional data and fixture files
tests/                            # automated behavior tests
public/manus-routes.json          # complete route manifest
README.md, .env.example, Dockerfile, plan.md, TODO.md
```

## Design system

Candidate directions: **Regulatory Signal** (0.06): navy command-center surfaces with teal evidence markers; **Civic Ledger** (0.04): paper-white workspace with indigo ledger rails; **Blue Room Minimalism** (0.03): quiet blue-gray panels with restrained status color. Choose **Regulatory Signal**.

- **Design movement:** Civic-tech command center with editorial evidence handling.
- **Core principles:** traceability over decoration; compact but calm information density; status color is semantic; every AI indicator is paired with a human next step.
- **Color philosophy:** deep navy communicates institutional trust, electric teal marks machine-derived evidence, amber flags attention without implying guilt, and red is reserved for concrete workflow blockers such as expired documents.
- **Layout paradigm:** a persistent left rail anchors navigation while a wide, asymmetrical content canvas puts the active queue and evidence context above secondary metrics.
- **Signature elements:** a thin teal “evidence rail” on active cards; monospaced reference IDs; layered status chips with text labels and icons rather than color alone.
- **Interaction philosophy:** actions are explicit and reversible; simulations announce themselves before execution; completed checks surface provenance and timestamps.
- **Animation:** subtle 150–220ms panel and chip transitions only; no distracting motion; loading states use skeletons and a pulsing evidence rail.
- **Typography system:** Inter for UI and headings, JetBrains Mono for references, timestamps, hashes, and API evidence. Strong 12–14px labels, 20–32px editorial metrics, and readable 14–16px body copy.
- **Brand essence:** a trustworthy review cockpit for faster, more accountable institutional scrutiny; precise, transparent, restrained.
- **Brand voice:** direct and evidence-led. Example lines: “Automated checks surface what needs a human decision.” and “Simulated source response — verify through an authorized channel.”
- **Wordmark/logo:** an outlined shield split by a vertical evidence rail, paired with the SmartVerify wordmark.
- **Signature brand color:** `#18B6A4` evidence teal.

## Delivery workflow

Implement the vertical slice first (seeded applications → detail → upload/process → validation → simulated issuer check → findings resolution → audit → export), then add configurable rules, infrastructure, role management, settings, and the remaining dashboard routes. Run typecheck, lint, build, seed/migration, and the automated test suite against an isolated test database. Start Next on port 3000, verify `/`, `/api/health`, and `/manus-routes.json`, then checkpoint the working tree.

## Public portal boundary

The public portal is a separate no-login experience for students, faculty, institutions, and stakeholders to submit a complaint and track a case with its case reference plus email. It does not expose complainant contact data, unrestricted institution case histories, officer notes, or internal overlap details. Government officers use the authenticated complaint-monitoring view to coordinate RB, PGRC, regional offices, and other cells. All seeded cases, status data, and overlap alerts are synthetic.

## Explicit limitations

Official issuer APIs, AICTE records, government portals, malware scanners, production object storage, OCR binaries, and statutory decisions are not available in this demo. The app provides adapter seams and clearly labels simulated/unavailable results. Image observations are non-conclusive and do not establish physical compliance, authenticity, capacity, or fraud.
