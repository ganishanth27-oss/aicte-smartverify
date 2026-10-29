import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

let cached: Database.Database | null = null;

export function dbPath() {
  return process.env.SMARTVERIFY_DB_PATH || path.join(process.cwd(), 'data', 'smartverify.db');
}

export function getDb() {
  if (cached) return cached;
  const filename = dbPath();
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  cached = new Database(filename);
  cached.pragma('journal_mode = WAL');
  cached.pragma('foreign_keys = ON');
  migrate(cached);
  return cached;
}

export function resetDb() {
  cached?.close();
  cached = null;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL,
      institution_id TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, institution_name TEXT NOT NULL,
      institution_id TEXT NOT NULL, category TEXT NOT NULL, academic_session TEXT NOT NULL,
      programme TEXT NOT NULL, requested_intake INTEGER NOT NULL, faculty TEXT,
      previous_approval TEXT, payment_status TEXT NOT NULL, payment_reference TEXT,
      status TEXT NOT NULL, assigned_reviewer TEXT, applicant_user_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY(applicant_user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS institutional_records (
      id TEXT PRIMARY KEY, institution_id TEXT NOT NULL, approved_programme TEXT NOT NULL,
      approved_intake INTEGER NOT NULL, approval_status TEXT NOT NULL,
      faculty_count INTEGER NOT NULL, accreditation_status TEXT NOT NULL,
      ter_status TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, application_id TEXT NOT NULL, name TEXT NOT NULL,
      type TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL, storage_path TEXT NOT NULL, processing_status TEXT NOT NULL,
      extracted_text TEXT, extracted_fields TEXT NOT NULL DEFAULT '{}', confidence REAL,
      page_evidence TEXT NOT NULL DEFAULT '[]', expiry_date TEXT, issued_date TEXT,
      issuing_authority TEXT, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
      UNIQUE(application_id, sha256)
    );
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, version TEXT NOT NULL,
      effective_date TEXT NOT NULL, source_reference TEXT NOT NULL, status TEXT NOT NULL,
      description TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rule_requirements (
      id TEXT PRIMARY KEY, rule_id TEXT NOT NULL, requirement_type TEXT NOT NULL,
      target TEXT NOT NULL, severity TEXT NOT NULL, description TEXT NOT NULL,
      FOREIGN KEY(rule_id) REFERENCES rules(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY, application_id TEXT NOT NULL, document_id TEXT,
      category TEXT NOT NULL, severity TEXT NOT NULL, title TEXT NOT NULL,
      explanation TEXT NOT NULL, evidence TEXT NOT NULL, detection_method TEXT NOT NULL,
      confidence REAL, next_step TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Open',
      reviewer_comment TEXT, page_number INTEGER, field_name TEXT, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS issuer_results (
      id TEXT PRIMARY KEY, application_id TEXT NOT NULL, document_id TEXT,
      scenario TEXT NOT NULL, status TEXT NOT NULL, source_name TEXT NOT NULL,
      source_reference TEXT NOT NULL, provenance TEXT NOT NULL, matched_fields TEXT NOT NULL,
      discrepancies TEXT NOT NULL, reason TEXT NOT NULL, simulated INTEGER NOT NULL DEFAULT 1,
      checked_at TEXT NOT NULL,
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS infrastructure_items (
      id TEXT PRIMARY KEY, label TEXT NOT NULL, category TEXT NOT NULL,
      required INTEGER NOT NULL DEFAULT 1, guidance TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS infrastructure_observations (
      id TEXT PRIMARY KEY, application_id TEXT NOT NULL, item_id TEXT NOT NULL,
      observation TEXT NOT NULL, evidence_document_id TEXT, confidence REAL,
      recommendation TEXT, status TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY(item_id) REFERENCES infrastructure_items(id),
      FOREIGN KEY(evidence_document_id) REFERENCES documents(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT NOT NULL, role TEXT NOT NULL,
      action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
      before_value TEXT, after_value TEXT, metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS public_cases (
      id TEXT PRIMARY KEY, case_reference TEXT NOT NULL UNIQUE, access_code TEXT NOT NULL,
      complainant_name TEXT NOT NULL, complainant_email TEXT NOT NULL, complainant_phone TEXT,
      institution_name TEXT NOT NULL, institution_id TEXT, region TEXT NOT NULL,
      category TEXT NOT NULL, description TEXT NOT NULL, bureau TEXT NOT NULL,
      assigned_officer TEXT, status TEXT NOT NULL, last_action TEXT NOT NULL,
      next_action TEXT NOT NULL, received_at TEXT NOT NULL, last_action_at TEXT NOT NULL,
      expected_disposal_date TEXT, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS public_case_actions (
      id TEXT PRIMARY KEY, case_id TEXT NOT NULL, bureau TEXT NOT NULL,
      officer TEXT, action TEXT NOT NULL, remarks TEXT NOT NULL,
      supporting_documents INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      FOREIGN KEY(case_id) REFERENCES public_cases(id) ON DELETE CASCADE
    );
  `);
}

export function closeDb() {
  if (cached) cached.close();
  cached = null;
}
