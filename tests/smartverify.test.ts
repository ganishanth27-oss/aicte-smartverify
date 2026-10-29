import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, resetDb } from '../src/lib/db';
import { seedIfEmpty } from '../src/lib/seed-data';
import * as repo from '../src/lib/repository';

const testRoot = path.join(process.cwd(), 'data', 'test-runtime');
fs.rmSync(testRoot, { recursive: true, force: true });
fs.mkdirSync(testRoot, { recursive: true });
process.env.SMARTVERIFY_DB_PATH = process.env.SMARTVERIFY_DB_PATH || path.join(testRoot, 'smartverify-test.db');
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(testRoot, 'uploads');
import * as issuer from '../src/lib/issuer';

const officer = { id: 'u-officer', name: 'Ananya Rao', email: 'ananya.rao@demo.gov', role: 'AICTE Officer/Reviewer' as const, institutionId: null };
const admin = { id: 'u-admin', name: 'Vikram Sen', email: 'vikram.sen@demo.gov', role: 'System Administrator' as const, institutionId: null };
const applicant = { id: 'u-applicant', name: 'Rohan Kulkarni', email: 'rohan.kulkarni@fictional.edu', role: 'Institution Applicant' as const, institutionId: 'INST-1002' };

test('database migrates and seeds five synthetic scenarios', () => {
  assert.equal(seedIfEmpty(), true);
  assert.equal(seedIfEmpty(), false);
  const apps = repo.listApplications({ user: officer });
  assert.equal(apps.length, 5);
  assert.ok(apps.some((app) => app.reference === 'EOA-2026-0001'));
});

test('application creation persists required fields and audit event', () => {
  const app = repo.createApplication({ institution_name: 'Test Civic University', institution_id: 'INST-TEST', category: 'Extension of Approval', academic_session: '2026-27', programme: 'B.Tech Civil Engineering', requested_intake: 40 }, officer)!;
  assert.equal(app.institution_name, 'Test Civic University');
  assert.equal(app.status, 'Draft');
  assert.ok(repo.listAudit('Created application').some((event: any) => event.entity_id === app.id));
});

test('institution applicant dashboard data is scoped and workflow edits are constrained', () => {
  const visible = repo.listApplications({ user: applicant });
  assert.deepEqual(visible.map((app) => app.id), ['app-missing']);
  assert.equal(repo.getApplicationForUser('app-clean', applicant), null);
  const submitted = repo.updateApplication('app-missing', { status: 'Submitted' }, applicant)!;
  assert.equal(submitted.status, 'Submitted');
  assert.throws(() => repo.updateApplication('app-missing', { status: 'Decision Pending' }, applicant), /Applicants may only save/);
});

test('public complaint portal supports tracking and government overlap monitoring', () => {
  const stats = repo.publicMonitoringStats();
  assert.equal(stats.total, 5);
  assert.equal(stats.overlapCount, 2);
  const tracked = repo.trackPublicCase('AICTE-PGRC-2026-001', 'asha.menon@example.org')!;
  assert.equal(tracked.status, 'Pending');
  assert.equal(tracked.overlap_flag, true);
  assert.equal((tracked as any).complainant_email, undefined);
  assert.throws(() => repo.listPublicCases({ user: applicant }), /FORBIDDEN/);
  const acknowledgement = repo.createPublicCase({ complainant_name: 'Demo Reporter', complainant_email: 'reporter@example.org', institution_name: 'Demo Technical Institute', region: 'Central', category: 'Other stakeholder concern', description: 'A synthetic complaint with enough detail for portal workflow testing.' });
  assert.match(acknowledgement.case_reference, /^AICTE-PUBLIC-/);
  assert.equal(repo.trackPublicCase(acknowledgement.case_reference, 'reporter@example.org')?.status, 'Received');
});

test('safe upload rejects unsupported types and processes text fixtures', async () => {
  const target = repo.createApplication({ institution_name: 'Upload Test College', institution_id: 'INST-UPLOAD', category: 'Extension of Approval', academic_session: '2026-27', programme: 'B.Tech Computer Science', requested_intake: 20 }, officer)!;
  await assert.rejects(() => repo.uploadDocument(target.id, { name: 'malware.exe', mime: 'application/octet-stream', buffer: Buffer.from('bad') }, officer), /Unsupported file type/);
  const result = await repo.uploadDocument(target.id, { name: 'new-affidavit.txt', mime: 'text/plain', buffer: Buffer.from('Affidavit\nInstitution: Northstar Institute of Technology\nInstitution ID: INST-1001\nProgramme: B.Tech Computer Science\nIntake: 120\nValid until: 2027-03-31') }, officer);
  assert.equal(result.processing_status, 'Processed');
  assert.equal(result.type, 'Affidavit / Undertaking');
  assert.equal((result.extracted_fields as any).institutionId, 'INST-1001');
  assert.equal(result.sha256.length, 64);
});

test('validation detects missing documents, expired dates, mismatched records, and near duplicates', () => {
  const missing = repo.validateApplication('app-missing', officer)!;
  assert.equal(missing.status, 'Rectification Required');
  assert.ok(missing.findings.some((f: any) => f.category === 'Document completeness'));
  const expired = repo.validateApplication('app-expired', officer)!;
  assert.ok(expired.findings.some((f: any) => f.category === 'Expiry'));
  const mismatch = repo.validateApplication('app-mismatch', officer)!;
  assert.ok(mismatch.findings.some((f: any) => f.category === 'Record mismatch'));
  const duplicate = repo.validateApplication('app-duplicate', officer)!;
  assert.ok(duplicate.findings.some((f: any) => f.category === 'Potential anomaly'));
});

test('validation distinguishes a clean application from non-compliance signals', () => {
  const clean = repo.validateApplication('app-clean', officer)!;
  assert.equal(clean.status, 'Validation Completed');
  assert.equal(clean.findings.length, 0);
});

test('simulated issuer adapter supports all documented scenarios and provenance', () => {
  for (const scenario of issuer.scenarios) {
    const result = repo.runIssuerVerification('app-clean', 'doc-c1', scenario, officer);
    assert.equal(result.simulated, 1);
    assert.match(result.sourceName, /Simulated/);
    assert.match(result.provenance, /No official/);
    assert.ok(result.status.length > 0);
  }
});

test('rule versioning is administrator-only and audit logged', () => {
  const rule = repo.createRule({ category: 'Institutional Change', version: '2026.9', effective_date: '2026-10-01', source_reference: 'Demo Change Note §1', description: 'Test rule' }, admin) as any;
  assert.equal(rule.version, '2026.9');
  assert.ok(repo.listRules().some((r: any) => r.id === rule.id));
  assert.throws(() => repo.createRule({ category: 'Institutional Change', version: '2026.10', effective_date: '2026-11-01', source_reference: 'x', description: 'x' }, officer), /FORBIDDEN/);
});

test('finding review, workflow actions, and reports persist', () => {
  const detail = repo.getApplication('app-mismatch')!;
  const finding = detail.findings[0] as any;
  repo.updateFinding(finding.id, { status: 'Resolved', reviewerComment: 'Synthetic review complete.' }, officer);
  const updated = repo.getApplication('app-mismatch')!;
  assert.ok(updated.findings.some((f: any) => f.id === finding.id && f.status === 'Resolved'));
  const report = repo.reportData('app-mismatch') as any;
  assert.match(report.demoNotice, /SIMULATED/);
  assert.match(repo.reportCsv('app-mismatch')!, /"Reference","Institution"/);
  assert.equal(repo.reportPdf('app-mismatch')!.subarray(0, 5).toString(), '%PDF-');
  assert.ok(repo.listAudit('Resolved').length > 0);
});

test('database can be closed cleanly after tests', () => {
  assert.ok(getDb().prepare('SELECT 1 as ok').get());
  resetDb();
});
