import crypto from 'node:crypto';
import { getDb } from './db';
import { seedIfEmpty } from './seed-data';
import { parseJson, type Application, type DashboardStats, type Finding, type IssuerResult, type PublicCase, type PublicMonitoringStats, type SessionUser } from './types';
import { simulateIssuer, type IssuerScenario } from './issuer';
import { processUpload } from './document-processor';
import { renderSimplePdf } from './pdf';

export function ensureSeeded() { seedIfEmpty(); }
const db = () => getDb();
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function audit(user: SessionUser, action: string, entityType: string, entityId: string | null, before: unknown = null, after: unknown = null, metadata: unknown = {}) {
  db().prepare('INSERT INTO audit_logs (id,user_id,user_name,role,action,entity_type,entity_id,before_value,after_value,metadata,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id('audit'), user.id, user.name, user.role, action, entityType, entityId, JSON.stringify(before), JSON.stringify(after), JSON.stringify(metadata), now());
}

export function listApplications(input: { q?: string; status?: string; category?: string; user: SessionUser }) {
  const params: unknown[] = [];
  const where: string[] = ['1 = 1'];
  if (input.q) { where.push('(a.reference LIKE ? OR a.institution_name LIKE ? OR a.programme LIKE ?)'); params.push(`%${input.q}%`, `%${input.q}%`, `%${input.q}%`); }
  if (input.status && input.status !== 'All') { where.push('a.status = ?'); params.push(input.status); }
  if (input.category && input.category !== 'All') { where.push('a.category = ?'); params.push(input.category); }
  if (input.user.role === 'Institution Applicant') { where.push('a.applicant_user_id = ?'); params.push(input.user.id); }
  return db().prepare(`SELECT a.*, (SELECT COUNT(*) FROM documents d WHERE d.application_id = a.id) as document_count, (SELECT COUNT(*) FROM findings f WHERE f.application_id = a.id AND f.status != 'Resolved') as open_findings FROM applications a WHERE ${where.join(' AND ')} ORDER BY a.updated_at DESC`).all(...params) as Application[];
}

const officerRoles = ['System Administrator', 'AICTE Officer/Reviewer', 'Technical Analyst', 'Read-only Auditor'];
const publicCaseColumns = `pc.*, EXISTS (SELECT 1 FROM public_cases p2 WHERE p2.institution_id = pc.institution_id AND p2.id != pc.id AND p2.status != 'Disposed') AS overlap_flag`;

function publicCaseWithHistory(row: any, includePrivate = false): PublicCase {
  const related = db().prepare("SELECT case_reference FROM public_cases WHERE institution_id = ? AND id != ? AND status != 'Disposed' ORDER BY received_at DESC").all(row.institution_id, row.id) as Array<{ case_reference: string }>;
  const actions = db().prepare('SELECT * FROM public_case_actions WHERE case_id = ? ORDER BY created_at ASC').all(row.id);
  const result = { ...row, overlap_flag: Boolean(row.overlap_flag), related_case_references: related.map((item) => item.case_reference), actions } as PublicCase;
  if (!includePrivate) {
    delete result.access_code; delete result.complainant_name; delete result.complainant_email; delete result.complainant_phone; delete result.description;
  }
  return result;
}

export function publicMonitoringStats(): PublicMonitoringStats {
  const scalar = (sql: string) => Number((db().prepare(sql).get() as { count: number }).count || 0);
  return {
    total: scalar('SELECT COUNT(*) as count FROM public_cases'),
    pending: scalar("SELECT COUNT(*) as count FROM public_cases WHERE status IN ('Received','Pending')"),
    underProcess: scalar("SELECT COUNT(*) as count FROM public_cases WHERE status = 'Under Process'"),
    disposed: scalar("SELECT COUNT(*) as count FROM public_cases WHERE status = 'Disposed'"),
    transferred: scalar("SELECT COUNT(*) as count FROM public_cases WHERE status = 'Transferred'"),
    escalated: scalar("SELECT COUNT(*) as count FROM public_cases WHERE status = 'Escalated'"),
    overdue: scalar("SELECT COUNT(*) as count FROM public_cases WHERE expected_disposal_date < date('now') AND status != 'Disposed'"),
    overlapCount: scalar("SELECT COUNT(*) as count FROM public_cases pc WHERE pc.status != 'Disposed' AND EXISTS (SELECT 1 FROM public_cases p2 WHERE p2.institution_id = pc.institution_id AND p2.id != pc.id AND p2.status != 'Disposed')"),
    byBureau: db().prepare('SELECT bureau, COUNT(*) as count FROM public_cases GROUP BY bureau ORDER BY count DESC').all() as Array<{ bureau: string; count: number }>,
    byRegion: db().prepare('SELECT region, COUNT(*) as count FROM public_cases GROUP BY region ORDER BY count DESC').all() as Array<{ region: string; count: number }>,
    byStatus: db().prepare('SELECT status, COUNT(*) as count FROM public_cases GROUP BY status ORDER BY count DESC').all() as Array<{ status: string; count: number }>
  };
}

export function listPublicCases(input: { user: SessionUser; q?: string; bureau?: string; region?: string; status?: string; category?: string }) {
  if (!officerRoles.includes(input.user.role)) throw new Error('FORBIDDEN');
  const where = ['1 = 1']; const params: unknown[] = [];
  if (input.q) { where.push('(pc.case_reference LIKE ? OR pc.institution_name LIKE ? OR pc.institution_id LIKE ? OR pc.category LIKE ?)'); params.push(...[input.q, input.q, input.q, input.q].map((value) => `%${value}%`)); }
  if (input.bureau && input.bureau !== 'All') { where.push('pc.bureau = ?'); params.push(input.bureau); }
  if (input.region && input.region !== 'All') { where.push('pc.region = ?'); params.push(input.region); }
  if (input.status && input.status !== 'All') { where.push('pc.status = ?'); params.push(input.status); }
  if (input.category && input.category !== 'All') { where.push('pc.category = ?'); params.push(input.category); }
  const rows = db().prepare(`SELECT ${publicCaseColumns} FROM public_cases pc WHERE ${where.join(' AND ')} ORDER BY CASE WHEN pc.status = 'Escalated' THEN 0 WHEN pc.status != 'Disposed' THEN 1 ELSE 2 END, pc.updated_at DESC`).all(...params);
  return (rows as any[]).map((row) => publicCaseWithHistory(row, true));
}

export function getPublicCaseForOfficer(caseId: string, user: SessionUser) {
  if (!officerRoles.includes(user.role)) throw new Error('FORBIDDEN');
  const row = db().prepare(`SELECT ${publicCaseColumns} FROM public_cases pc WHERE pc.id = ? OR pc.case_reference = ?`).get(caseId, caseId);
  return row ? publicCaseWithHistory(row, true) : null;
}

export function trackPublicCase(caseReference: string, email: string) {
  const row = db().prepare(`SELECT ${publicCaseColumns} FROM public_cases pc WHERE pc.case_reference = ? AND lower(pc.complainant_email) = lower(?)`).get(caseReference.trim(), email.trim());
  return row ? publicCaseWithHistory(row, false) : null;
}

export function createPublicCase(input: Record<string, unknown>) {
  const required = ['complainant_name', 'complainant_email', 'institution_name', 'region', 'category', 'description'];
  for (const key of required) if (!String(input[key] || '').trim()) throw new Error(`Missing required field: ${key}`);
  const email = String(input.complainant_email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address for case tracking.');
  const caseId = id('public-case'); const reference = `AICTE-PUBLIC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`; const accessCode = `DEMO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; const created = now();
  const expected = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  db().prepare('INSERT INTO public_cases (id,case_reference,access_code,complainant_name,complainant_email,complainant_phone,institution_name,institution_id,region,category,description,bureau,assigned_officer,status,last_action,next_action,received_at,last_action_at,expected_disposal_date,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(caseId, reference, accessCode, String(input.complainant_name).trim(), email, input.complainant_phone || null, String(input.institution_name).trim(), input.institution_id || null, String(input.region), String(input.category), String(input.description).trim(), 'PGRC Intake', null, 'Received', 'Complaint submitted through the public portal.', 'Initial triage and institution identification.', created, created, expected, created);
  db().prepare('INSERT INTO public_case_actions (id,case_id,bureau,officer,action,remarks,supporting_documents,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id('public-action'), caseId, 'PGRC Intake', null, 'Complaint received', 'Acknowledgement generated. The case is awaiting initial triage.', 0, created);
  return { case_reference: reference, access_code: accessCode, status: 'Received', received_at: created, expected_disposal_date: expected };
}

export function getApplication(applicationId: string) {
  const application = db().prepare('SELECT * FROM applications WHERE id = ? OR reference = ?').get(applicationId, applicationId) as Application | undefined;
  if (!application) return null;
  const documents: any[] = db().prepare('SELECT * FROM documents WHERE application_id = ? ORDER BY created_at DESC').all(application.id).map((row) => ({ ...row as object, extracted_fields: parseJson((row as { extracted_fields: string }).extracted_fields, {}), page_evidence: parseJson((row as { page_evidence: string }).page_evidence, []) }));
  const findings = db().prepare('SELECT * FROM findings WHERE application_id = ? ORDER BY CASE severity WHEN \'High\' THEN 1 WHEN \'Medium\' THEN 2 ELSE 3 END, created_at DESC').all(application.id);
  const issuer = db().prepare('SELECT * FROM issuer_results WHERE application_id = ? ORDER BY checked_at DESC').all(application.id);
  const observations = db().prepare('SELECT io.*, ii.label, ii.category, ii.guidance FROM infrastructure_observations io JOIN infrastructure_items ii ON ii.id = io.item_id WHERE io.application_id = ? ORDER BY io.created_at DESC').all(application.id);
  const record = db().prepare('SELECT * FROM institutional_records WHERE institution_id = ?').get(application.institution_id);
  return { ...application, documents, findings, issuerResults: issuer, observations, institutionalRecord: record || null };
}

export function getApplicationForUser(applicationId: string, user: SessionUser) {
  const application = getApplication(applicationId);
  if (!application) return null;
  if (user.role === 'Institution Applicant' && application.applicant_user_id !== user.id) return null;
  return application;
}

export function createApplication(input: Record<string, unknown>, user: SessionUser) {
  const applicationId = id('app');
  const reference = `EOA-2026-${String(Date.now()).slice(-5)}`;
  const created = now();
  const required = ['institution_name','institution_id','category','academic_session','programme','requested_intake'];
  for (const key of required) if (!input[key]) throw new Error(`Missing required field: ${key}`);
  db().prepare('INSERT INTO applications (id,reference,institution_name,institution_id,category,academic_session,programme,requested_intake,faculty,previous_approval,payment_status,payment_reference,status,assigned_reviewer,applicant_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(applicationId, reference, input.institution_name, input.institution_id, input.category, input.academic_session, input.programme, Number(input.requested_intake), input.faculty || null, input.previous_approval || null, input.payment_status || 'Pending', input.payment_reference || null, 'Draft', user.role === 'Institution Applicant' ? null : 'u-officer', user.role === 'Institution Applicant' ? user.id : input.applicant_user_id || null, created, created);
  audit(user, 'Created application', 'application', applicationId, null, input);
  return getApplication(applicationId);
}

export function updateApplication(applicationId: string, patch: Record<string, unknown>, user: SessionUser) {
  const existing = db().prepare('SELECT * FROM applications WHERE id = ?').get(applicationId) as Application | undefined;
  if (!existing) throw new Error('Application not found');
  if (user.role === 'Institution Applicant' && existing.applicant_user_id !== user.id) throw new Error('FORBIDDEN');
  if (user.role === 'Institution Applicant' && patch.status && !['Draft', 'Submitted'].includes(String(patch.status))) throw new Error('Applicants may only save Draft or Submitted applications.');
  const allowed = ['institution_name','institution_id','category','academic_session','programme','requested_intake','faculty','previous_approval','payment_status','payment_reference','status','assigned_reviewer'];
  const next = { ...existing, ...Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key))) } as Application;
  db().prepare('UPDATE applications SET institution_name=?, institution_id=?, category=?, academic_session=?, programme=?, requested_intake=?, faculty=?, previous_approval=?, payment_status=?, payment_reference=?, status=?, assigned_reviewer=?, updated_at=? WHERE id=?').run(next.institution_name, next.institution_id, next.category, next.academic_session, next.programme, Number(next.requested_intake), next.faculty, next.previous_approval, next.payment_status, next.payment_reference, next.status, next.assigned_reviewer, now(), applicationId);
  audit(user, 'Updated application', 'application', applicationId, existing, next);
  return getApplication(applicationId);
}

export async function uploadDocument(applicationId: string, file: { name: string; mime: string; buffer: Buffer }, user: SessionUser) {
  if (!getApplicationForUser(applicationId, user)) throw new Error('Application not found');
  const result = await processUpload({ applicationId, name: file.name, mime: file.mime, buffer: file.buffer, uploadedBy: user.id });
  audit(user, 'Uploaded and processed document', 'document', result.id, null, { name: result.name, type: result.type, sha256: result.sha256, processingStatus: result.processing_status });
  return result;
}

export function validateApplication(applicationId: string, user: SessionUser) {
  const application = getApplication(applicationId);
  if (!application) throw new Error('Application not found');
  db().prepare("DELETE FROM findings WHERE application_id = ? AND detection_method LIKE 'SmartVerify rule%'").run(applicationId);
  const findings: unknown[] = [];
  const rule = db().prepare('SELECT * FROM rules WHERE category = ? AND status = \'Active\' ORDER BY version DESC LIMIT 1').get(application.category) as { id: string; version: string; source_reference: string } | undefined;
  if (rule) {
    const reqs = db().prepare('SELECT * FROM rule_requirements WHERE rule_id = ?').all(rule.id) as Array<{ requirement_type: string; target: string; severity: string; description: string }>;
    for (const req of reqs.filter((r) => r.requirement_type === 'document')) {
      const present = application.documents.some((doc: { type: string }) => doc.type === req.target);
      if (!present) findings.push(addFinding(applicationId, null, 'Document completeness', req.severity, `Missing ${req.target}`, `${req.description} No matching document was received.`, `Application category ${application.category}; rule ${rule.version} (${rule.source_reference}).`, 'SmartVerify rule engine', 0.99, `Request the ${req.target} or record why it is not applicable.`));
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const doc of application.documents as Array<{ id: string; name: string; expiry_date: string | null }>) {
    if (doc.expiry_date && doc.expiry_date < today) findings.push(addFinding(applicationId, doc.id, 'Expiry', 'High', 'Expired document indicator', `${doc.name} has an expiry date of ${doc.expiry_date}, before the validation date ${today}.`, `Document ${doc.id}; extracted expiry_date=${doc.expiry_date}.`, 'SmartVerify rule engine', 0.98, 'Obtain a current document and have an authorized reviewer assess the record.'));
  }
  const record = application.institutionalRecord as { approved_programme: string; approved_intake: number; approval_status: string } | null;
  if (!record) findings.push(addFinding(applicationId, null, 'Institutional record', 'Medium', 'Institutional record unavailable', 'No authorized institutional record was available for this comparison; this is inconclusive and not evidence of non-compliance.', 'Institution ID ' + application.institution_id, 'SmartVerify record comparison', 1, 'Confirm the institution identifier or connect an authorized record source.'));
  else {
    if (record.approved_programme.toLowerCase() !== application.programme.toLowerCase()) findings.push(addFinding(applicationId, null, 'Record mismatch', 'High', 'Programme mismatch against institutional record', `Application requests ${application.programme}; the authorized synthetic record lists ${record.approved_programme}.`, `Application programme=${application.programme}; record approved_programme=${record.approved_programme}.`, 'SmartVerify record comparison', 0.97, 'Review the approved programme record and request clarification from the institution.'));
    if (Number(record.approved_intake) !== Number(application.requested_intake)) findings.push(addFinding(applicationId, null, 'Record mismatch', 'High', 'Requested intake mismatch against institutional record', `Application requests ${application.requested_intake} seats; the authorized synthetic record lists ${record.approved_intake}.`, `Application intake=${application.requested_intake}; record approved_intake=${record.approved_intake}.`, 'SmartVerify record comparison', 0.97, 'Review the approved intake record; do not auto-decide the application.'));
  }
  const byType = new Map<string, Array<{ id: string; sha256: string; extracted_fields: Record<string, unknown> }>>();
  for (const doc of application.documents as Array<{ id: string; type: string; sha256: string; extracted_fields: Record<string, unknown> }>) byType.set(doc.type, [...(byType.get(doc.type) || []), doc]);
  for (const [type, docs] of byType) if (docs.length > 1) findings.push(addFinding(applicationId, docs[1].id, 'Potential anomaly', 'Medium', 'Potential duplicate or similar document', `Multiple ${type} files share matching extracted institution evidence. This is a potential anomaly — manual verification required.`, `Compared ${docs.map((d) => d.id).join(', ')}; hashes differ, so exact duplication was not established.`, 'SmartVerify similarity heuristic', 0.78, 'Compare originals and verify the issuing reference through an authorized channel.'));
  const hasSubstantiveHigh = findings.some((finding) => (finding as { severity: string; category: string }).severity === 'High' && (finding as { category: string }).category !== 'Document completeness');
  const status = findings.length ? (hasSubstantiveHigh ? 'Manual Review Required' : 'Rectification Required') : 'Validation Completed';
  updateApplication(applicationId, { status }, user);
  audit(user, 'Ran validation engine', 'application', applicationId, null, { findingCount: findings.length, ruleVersion: rule?.version || null, status });
  return getApplication(applicationId);
}

function addFinding(applicationId: string, documentId: string | null, category: string, severity: string, title: string, explanation: string, evidence: string, method: string, confidence: number, nextStep: string) {
  const findingId = id('finding');
  const created = now();
  db().prepare('INSERT INTO findings (id,application_id,document_id,category,severity,title,explanation,evidence,detection_method,confidence,next_step,status,reviewer_comment,page_number,field_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(findingId, applicationId, documentId, category, severity, title, explanation, evidence, method, confidence, nextStep, 'Open', null, documentId ? 1 : null, null, created, created);
  return db().prepare('SELECT * FROM findings WHERE id = ?').get(findingId) as Finding;
}

export function updateFinding(findingId: string, patch: { status?: string; reviewerComment?: string }, user: SessionUser) {
  const existing = db().prepare('SELECT * FROM findings WHERE id = ?').get(findingId) as Finding | undefined;
  if (!existing) throw new Error('Finding not found');
  db().prepare('UPDATE findings SET status = ?, reviewer_comment = ?, updated_at = ? WHERE id = ?').run(patch.status || existing.status, patch.reviewerComment ?? existing.reviewer_comment, now(), findingId);
  audit(user, 'Updated finding review status', 'finding', findingId, existing, patch);
  return db().prepare('SELECT * FROM findings WHERE id = ?').get(findingId);
}

export function runIssuerVerification(applicationId: string, documentId: string | null, scenario: IssuerScenario, user: SessionUser) {
  const result = simulateIssuer({ applicationId, documentId, scenario });
  db().prepare('INSERT INTO issuer_results (id,application_id,document_id,scenario,status,source_name,source_reference,provenance,matched_fields,discrepancies,reason,simulated,checked_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(result.id, result.applicationId, result.documentId, result.scenario, result.status, result.sourceName, result.sourceReference, result.provenance, result.matchedFields, result.discrepancies, result.reason, result.simulated, result.checkedAt);
  audit(user, 'Ran simulated issuer verification', 'issuer_result', result.id, null, result);
  return result;
}

export function listRules() {
  return db().prepare('SELECT r.*, (SELECT COUNT(*) FROM rule_requirements rr WHERE rr.rule_id = r.id) as requirement_count FROM rules r ORDER BY r.category, r.version DESC').all();
}
export function createRule(input: Record<string, unknown>, user: SessionUser) {
  if (user.role !== 'System Administrator') throw new Error('FORBIDDEN');
  const ruleId = id('rule');
  db().prepare('INSERT INTO rules (id,category,version,effective_date,source_reference,status,description,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(ruleId, input.category, input.version, input.effective_date, input.source_reference, input.status || 'Draft', input.description, user.id, now());
  audit(user, 'Created validation rule version', 'rule', ruleId, null, input);
  return db().prepare('SELECT * FROM rules WHERE id = ?').get(ruleId);
}
export function listAudit(query = '') {
  if (!query) return db().prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 250').all();
  return db().prepare('SELECT * FROM audit_logs WHERE action LIKE ? OR entity_type LIKE ? OR user_name LIKE ? OR entity_id LIKE ? OR before_value LIKE ? OR after_value LIKE ? OR metadata LIKE ? ORDER BY created_at DESC LIMIT 250').all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
}
export function listInfrastructure() { return db().prepare('SELECT * FROM infrastructure_items ORDER BY required DESC, category, label').all(); }
export function addInfrastructureObservation(input: Record<string, unknown>, user: SessionUser) {
  const observationId = id('obs');
  db().prepare('INSERT INTO infrastructure_observations (id,application_id,item_id,observation,evidence_document_id,confidence,recommendation,status,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(observationId, input.application_id, input.item_id, input.observation, input.evidence_document_id || null, Number(input.confidence || 0.5), input.recommendation || 'Consider additional documents or physical inspection.', input.status || 'Needs review', user.id, now());
  audit(user, 'Added infrastructure evidence observation', 'infrastructure_observation', observationId, null, input);
  return db().prepare('SELECT * FROM infrastructure_observations WHERE id = ?').get(observationId);
}

export function dashboardStats(user: SessionUser): DashboardStats {
  ensureSeeded();
  const apps = listApplications({ user });
  const scalar = (sql: string, ...params: unknown[]) => Number((db().prepare(sql).get(...params) as { count: number }).count || 0);
  const appIds = apps.map((app) => app.id);
  const scoped = appIds.length ? `AND application_id IN (${appIds.map(() => '?').join(',')})` : 'AND 1 = 0';
  const stats: DashboardStats = {
    total: apps.length,
    pendingValidation: apps.filter((app) => ['Submitted','Processing'].includes(app.status)).length,
    manualReview: apps.filter((app) => ['Manual Review Required','Officer Review'].includes(app.status)).length,
    missingDocuments: scalar(`SELECT COUNT(*) as count FROM findings WHERE category = 'Document completeness' AND status != 'Resolved' ${scoped}`, ...appIds),
    expiredDocuments: scalar(`SELECT COUNT(*) as count FROM findings WHERE category = 'Expiry' AND status != 'Resolved' ${scoped}`, ...appIds),
    inconsistencies: scalar(`SELECT COUNT(*) as count FROM findings WHERE category = 'Record mismatch' AND status != 'Resolved' ${scoped}`, ...appIds),
    anomalies: scalar(`SELECT COUNT(*) as count FROM findings WHERE category = 'Potential anomaly' AND status != 'Resolved' ${scoped}`, ...appIds),
    awaitingOfficer: apps.filter((app) => app.status === 'Decision Pending').length,
    verified: scalar(`SELECT COUNT(*) as count FROM issuer_results WHERE status LIKE 'Verified%' ${appIds.length ? `AND application_id IN (${appIds.map(() => '?').join(',')})` : 'AND 1 = 0'}`, ...appIds),
    pendingIssuer: scalar(`SELECT COUNT(*) as count FROM issuer_results WHERE status LIKE 'Verification pending%' ${appIds.length ? `AND application_id IN (${appIds.map(() => '?').join(',')})` : 'AND 1 = 0'}`, ...appIds),
    statusDistribution: db().prepare(`SELECT status, COUNT(*) as count FROM applications WHERE id IN (${appIds.length ? appIds.map(() => '?').join(',') : "''"}) GROUP BY status ORDER BY count DESC`).all(...appIds) as Array<{ status: string; count: number }>,
    recentAudit: listAudit('').slice(0, 6) as Array<Record<string, unknown>>
  };
  return stats;
}

export function reportData(applicationId: string) {
  const application = getApplication(applicationId);
  if (!application) return null;
  const rules = db().prepare('SELECT * FROM rules WHERE category = ? ORDER BY version DESC').all(application.category);
  return { generatedAt: now(), demoNotice: 'DEMO REPORT — SYNTHETIC DATA — SIMULATED VERIFICATION ONLY — NOT AN OFFICIAL AICTE RECORD.', application, rules, audit: listAudit(application.reference) };
}

export function reportCsv(applicationId: string) {
  const data = reportData(applicationId);
  if (!data) return null;
  const app = data.application as Application & { documents: Array<Record<string, unknown>>; findings: Array<Record<string, unknown>>; issuerResults: Array<Record<string, unknown>> };
  const rows = [['Reference','Institution','Category','Status','Document count','Open findings','Issuer status'], [app.reference, app.institution_name, app.category, app.status, String(app.documents.length), String(app.findings.filter((f) => f.status !== 'Resolved').length), app.issuerResults[0]?.status ? String(app.issuerResults[0].status) : 'Not checked']];
  return rows.map((row) => row.map((value) => `"${value.replaceAll('"','""')}"`).join(',')).join('\n');
}

export function reportPdf(applicationId: string) {
  const data = reportData(applicationId);
  if (!data) return null;
  const app = data.application as Application & { documents: Array<Record<string, unknown>>; findings: Array<Record<string, unknown>>; issuerResults: Array<Record<string, unknown>> };
  return renderSimplePdf([
    'AICTE SmartVerify — DEMO REPORT',
    'SYNTHETIC DATA — SIMULATED VERIFICATION ONLY — NOT AN OFFICIAL AICTE RECORD',
    '',
    `Reference: ${app.reference}`,
    `Institution: ${app.institution_name} (${app.institution_id})`,
    `Category: ${app.category}`,
    `Programme: ${app.programme} | Requested intake: ${app.requested_intake}`,
    `Status: ${app.status}`,
    `Documents received: ${app.documents.length}`,
    `Open findings: ${app.findings.filter((f) => f.status !== 'Resolved').length}`,
    `Issuer result: ${app.issuerResults[0]?.status ? String(app.issuerResults[0].status) : 'Not checked'}`,
    '',
    'Review note: automated indicators are preliminary; competent authorities retain statutory decision responsibility.',
    `Generated: ${data.generatedAt}`
  ]);
}
