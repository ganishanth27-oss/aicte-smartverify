import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db';

const now = new Date().toISOString();

export function seedIfEmpty() {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number }).count;
  if (count > 0) { seedPublicCases(db); return false; }
  const insertUser = db.prepare('INSERT INTO users (id,name,email,role,institution_id,active,created_at) VALUES (?,?,?,?,?,?,?)');
  const users = [
    ['u-admin', 'Vikram Sen', 'vikram.sen@demo.gov', 'System Administrator', null],
    ['u-officer', 'Ananya Rao', 'ananya.rao@demo.gov', 'AICTE Officer/Reviewer', null],
    ['u-analyst', 'Meera Iyer', 'meera.iyer@demo.gov', 'Technical Analyst', null],
    ['u-applicant', 'Rohan Kulkarni', 'rohan.kulkarni@fictional.edu', 'Institution Applicant', 'INST-1002'],
    ['u-auditor', 'Sana Qureshi', 'sana.qureshi@demo.gov', 'Read-only Auditor', null]
  ];
  for (const user of users) insertUser.run(...user, 1, now);
  const insertRecord = db.prepare('INSERT INTO institutional_records (id,institution_id,approved_programme,approved_intake,approval_status,faculty_count,accreditation_status,ter_status,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  insertRecord.run('rec-1001', 'INST-1001', 'B.Tech Computer Science', 120, 'Active', 46, 'Valid', 'Paid', now);
  insertRecord.run('rec-1002', 'INST-1002', 'BBA Business Analytics', 60, 'Active', 23, 'Valid', 'Paid', now);
  insertRecord.run('rec-1003', 'INST-1003', 'B.Architecture', 40, 'Active', 18, 'Renewal due', 'Pending', now);
  insertRecord.run('rec-1004', 'INST-1004', 'B.Tech Electronics', 90, 'Active', 31, 'Valid', 'Paid', now);
  insertRecord.run('rec-1005', 'INST-1005', 'MBA Digital Strategy', 50, 'Active', 22, 'Valid', 'Paid', now);

  const apps = [
    ['app-clean', 'EOA-2026-0001', 'Northstar Institute of Technology', 'INST-1001', 'Extension of Approval', '2026-27', 'B.Tech Computer Science', 120, 'Engineering', 'EOA-2025-0091', 'Paid', 'TER-DEMO-1001', 'Validation Completed', 'u-officer', null],
    ['app-missing', 'EOA-2026-0002', 'Riverbend College of Management', 'INST-1002', 'Extension of Approval', '2026-27', 'BBA Business Analytics', 60, 'Management', 'EOA-2025-0084', 'Paid', 'TER-DEMO-1002', 'Rectification Required', 'u-analyst', 'u-applicant'],
    ['app-expired', 'EOA-2026-0003', 'Cedar Valley School of Architecture', 'INST-1003', 'Extension of Approval', '2026-27', 'B.Architecture', 40, 'Architecture', 'EOA-2025-0066', 'Paid', 'TER-DEMO-1003', 'Manual Review Required', 'u-officer', null],
    ['app-mismatch', 'EOA-2026-0004', 'Harborview Technical University', 'INST-1004', 'Change in Intake', '2026-27', 'B.Tech Electronics', 120, 'Engineering', 'EOA-2025-0042', 'Paid', 'TER-DEMO-1004', 'Manual Review Required', 'u-officer', null],
    ['app-duplicate', 'EOA-2026-0005', 'Juniper School of Business', 'INST-1005', 'New Programme', '2026-27', 'MBA Digital Strategy', 50, 'Management', null, 'Pending', null, 'Submitted', 'u-analyst', null]
  ];
  const insertApp = db.prepare('INSERT INTO applications (id,reference,institution_name,institution_id,category,academic_session,programme,requested_intake,faculty,previous_approval,payment_status,payment_reference,status,assigned_reviewer,applicant_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const app of apps) insertApp.run(...app, now, now);

  const insertRule = db.prepare('INSERT INTO rules (id,category,version,effective_date,source_reference,status,description,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
  const ruleRows = [
    ['rule-eoa-2026', 'Extension of Approval', '2026.1', '2026-04-01', 'Demo EoA Handbook §4.2', 'Active', 'Baseline document and record checks for EoA submissions.'],
    ['rule-change-2026', 'Change in Intake', '2026.1', '2026-04-01', 'Demo Intake Circular §3.1', 'Active', 'Cross-check requested intake against institutional approval record.'],
    ['rule-new-2026', 'New Programme', '2026.1', '2026-04-01', 'Demo Programme Circular §2.4', 'Active', 'Evidence and institutional record checks for new programmes.']
  ];
  for (const row of ruleRows) insertRule.run(...row, 'u-admin', now);
  const insertReq = db.prepare('INSERT INTO rule_requirements (id,rule_id,requirement_type,target,severity,description) VALUES (?,?,?,?,?,?)');
  const requirements = [
    ['req-1','rule-eoa-2026','document','Affidavit / Undertaking','High','Signed institutional undertaking is required.'],
    ['req-2','rule-eoa-2026','document','Accreditation / Certification','Medium','Current accreditation/certification evidence is required.'],
    ['req-3','rule-eoa-2026','document','Previous Approval','High','Previous approval reference or letter is required.'],
    ['req-4','rule-eoa-2026','document','Payment Evidence','Medium','Payment/TER evidence is required where payment status is paid.'],
    ['req-5','rule-change-2026','document','Previous Approval','High','Previous approval is required for intake changes.'],
    ['req-6','rule-change-2026','field','requested_intake','High','Requested intake must match the authorized institutional record.'],
    ['req-7','rule-new-2026','document','Accreditation / Certification','Medium','Programme certification or accreditation evidence is required.']
  ];
  for (const req of requirements) insertReq.run(...req);

  const insertItem = db.prepare('INSERT INTO infrastructure_items (id,label,category,required,guidance) VALUES (?,?,?,?,?)');
  insertItem.run('infra-lab', 'Teaching laboratory evidence', 'Academic facilities', 1, 'Link a photograph, floor plan, or certificate. Visual review is not a conclusive capacity test.');
  insertItem.run('infra-access', 'Accessible campus access', 'Safety and access', 1, 'Record visible observations only and recommend physical inspection where unclear.');
  insertItem.run('infra-library', 'Library / learning resource evidence', 'Academic facilities', 0, 'Link submitted evidence and identify missing supporting documents.');
  const insertSetting = db.prepare('INSERT INTO settings (key,value,description,updated_at) VALUES (?,?,?,?)');
  insertSetting.run('processing.mode', 'Demo text extraction + OCR unavailable fallback', 'Document processing capability currently available in this environment.', now);
  insertSetting.run('issuer.mode', 'SIMULATED ONLY', 'No official issuer connector is configured.', now);
  insertSetting.run('retention.days', '365', 'Demo retention policy setting; production policy requires approval.', now);

  seedDocuments(db);
  seedAudit(db);
  seedPublicCases(db);
  return true;
}

function seedPublicCases(db: ReturnType<typeof getDb>) {
  const cases = [
    ['pc-1001','AICTE-PGRC-2026-001','DEMO-1001','Asha Menon','asha.menon@example.org','+91 90000 10001','Northstar Institute of Technology','INST-1001','North','Student grievance','Delayed issuance of academic documents after completion.','PGRC','Officer Priya Nair','Pending','Complaint acknowledged; institution response awaited.','PGRC will review the response and update the complainant.','2026-10-03','2026-10-24','2026-11-02'],
    ['pc-1002','AICTE-RB-2026-014','DEMO-1002','Rahul Das','rahul.das@example.org','+91 90000 10002','Northstar Institute of Technology','INST-1001','North','Institutional compliance concern','Concern regarding the same institution’s programme delivery and student support process.','Regulation Bureau','Officer Kavita Shah','Under Process','Records requested from the institution.','RB and PGRC coordination review is required.','2026-10-08','2026-10-25','2026-11-08'],
    ['pc-1003','AICTE-PGRC-2026-009','DEMO-1003','Neha Thomas','neha.thomas@example.org','+91 90000 10003','Riverbend College of Management','INST-1002','South','Faculty grievance','Faculty representation received and responded to by the institution.','PGRC','Officer Arjun Rao','Disposed','Response reviewed and case closed with communication sent.','No further action unless new evidence is submitted.','2026-08-12','2026-09-14','2026-09-20'],
    ['pc-1004','AICTE-RO-2026-031','DEMO-1004','Sameer Khan','sameer.khan@example.org','+91 90000 10004','Cedar Valley School of Architecture','INST-1003','West','Student grievance','Request for review of examination and academic progression process.','Regional Office — West','Officer Meenal Joshi','Transferred','Transferred from regional intake to the Regulation Bureau.','Receiving Bureau to acknowledge and assign an officer.','2026-10-10','2026-10-23','2026-11-05'],
    ['pc-1005','AICTE-PGRC-2026-004','DEMO-1005','Ishita Roy','ishita.roy@example.org','+91 90000 10005','Harborview Technical University','INST-1004','East','Safety and infrastructure','Concern about access and safety arrangements reported by students.','PGRC','Officer Dev Malhotra','Escalated','Timeline exceeded; escalated to senior review.','Competent authority to decide coordination and inspection path.','2026-09-01','2026-10-20','2026-10-15']
  ];
  const insertCase = db.prepare('INSERT OR IGNORE INTO public_cases (id,case_reference,access_code,complainant_name,complainant_email,complainant_phone,institution_name,institution_id,region,category,description,bureau,assigned_officer,status,last_action,next_action,received_at,last_action_at,expected_disposal_date,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const row of cases) insertCase.run(...row, now);
  const insertAction = db.prepare('INSERT OR IGNORE INTO public_case_actions (id,case_id,bureau,officer,action,remarks,supporting_documents,created_at) VALUES (?,?,?,?,?,?,?,?)');
  const actions = [
    ['pca-1001-1','pc-1001','PGRC','Officer Priya Nair','Complaint received','Acknowledgement generated and institution identified from the submitted AICTE Permanent ID.',0,'2026-10-03'],
    ['pca-1001-2','pc-1001','PGRC','Officer Priya Nair','Response requested','Institution response requested within the prescribed timeline.',1,'2026-10-24'],
    ['pca-1002-1','pc-1002','Regulation Bureau','Officer Kavita Shah','Case opened','RB intake identified a matching active PGRC case for the same institution.',0,'2026-10-08'],
    ['pca-1002-2','pc-1002','Regulation Bureau','Officer Kavita Shah','Records requested','Institutional records requested; coordination with PGRC flagged.',1,'2026-10-25'],
    ['pca-1003-1','pc-1003','PGRC','Officer Arjun Rao','Disposed','Response reviewed and closure communication sent.',1,'2026-09-14'],
    ['pca-1004-1','pc-1004','Regional Office — West','Officer Meenal Joshi','Transferred','Transferred to RB because the matter requires regulatory review.',1,'2026-10-23'],
    ['pca-1005-1','pc-1005','PGRC','Officer Dev Malhotra','Escalated','Expected disposal timeline passed; senior review alert raised.',0,'2026-10-20']
  ];
  for (const row of actions) insertAction.run(...row);
}

function seedDocuments(db: ReturnType<typeof getDb>) {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const rows: Array<any[]> = [];
  const add = (id: string, app: string, name: string, type: string, text: string, expiry: string | null, confidence = 0.94) => {
    const file = path.join(uploadDir, `${id}.txt`);
    fs.writeFileSync(file, text);
    const crypto = require('node:crypto') as typeof import('node:crypto');
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    rows.push([id, app, name, type, 'text/plain', Buffer.byteLength(text), hash, file, 'Processed', text, JSON.stringify({ institutionName: text.match(/Institution: ([^\n]+)/)?.[1] || null, institutionId: text.match(/Institution ID: ([A-Z0-9-]+)/)?.[1] || null, programme: text.match(/Programme: ([^\n]+)/)?.[1] || null, requestedIntake: Number(text.match(/Intake: (\d+)/)?.[1] || 0), expiryDate: expiry, issuingAuthority: 'Synthetic Authority' }), confidence, JSON.stringify([{ page: 1, text: text.slice(0, 240) }]), expiry || '', '', 'Synthetic Authority', 'u-analyst', now]);
  };
  add('doc-c1','app-clean','northstar-affidavit.txt','Affidavit / Undertaking','Affidavit\nInstitution: Northstar Institute of Technology\nInstitution ID: INST-1001\nProgramme: B.Tech Computer Science\nIntake: 120\nIssued: 2026-04-02','2027-03-31');
  add('doc-c2','app-clean','northstar-accreditation.txt','Accreditation / Certification','Accreditation Certificate\nInstitution: Northstar Institute of Technology\nInstitution ID: INST-1001\nProgramme: B.Tech Computer Science\nIntake: 120\nValid until: 2027-03-31','2027-03-31');
  add('doc-c3','app-clean','northstar-approval.txt','Previous Approval','Previous Approval Letter\nInstitution: Northstar Institute of Technology\nInstitution ID: INST-1001\nProgramme: B.Tech Computer Science\nIntake: 120\nValid until: 2027-03-31','2027-03-31');
  add('doc-c4','app-clean','northstar-payment.txt','Payment Evidence','Payment Evidence\nInstitution ID: INST-1001\nTransaction: TER-DEMO-1001\nIssued: 2026-04-03','2027-03-31');
  add('doc-m1','app-missing','riverbend-approval.txt','Previous Approval','Previous Approval Letter\nInstitution: Riverbend College of Management\nInstitution ID: INST-1002\nProgramme: BBA Business Analytics\nIntake: 60\nValid until: 2027-03-31','2027-03-31');
  add('doc-e1','app-expired','cedar-affidavit.txt','Affidavit / Undertaking','Affidavit\nInstitution: Cedar Valley School of Architecture\nInstitution ID: INST-1003\nProgramme: B.Architecture\nIntake: 40\nValid until: 2024-03-31','2024-03-31');
  add('doc-e2','app-expired','cedar-accreditation.txt','Accreditation / Certification','Accreditation Certificate\nInstitution: Cedar Valley School of Architecture\nInstitution ID: INST-1003\nProgramme: B.Architecture\nIntake: 40\nValid until: 2024-03-31','2024-03-31');
  add('doc-e3','app-expired','cedar-approval.txt','Previous Approval','Previous Approval Letter\nInstitution: Cedar Valley School of Architecture\nInstitution ID: INST-1003\nProgramme: B.Architecture\nIntake: 40\nValid until: 2027-03-31','2027-03-31');
  add('doc-e4','app-expired','cedar-payment.txt','Payment Evidence','Payment Evidence\nInstitution ID: INST-1003\nTransaction: TER-DEMO-1003','2027-03-31');
  add('doc-x1','app-mismatch','harbor-approval.txt','Previous Approval','Previous Approval Letter\nInstitution: Harborview Technical University\nInstitution ID: INST-1004\nProgramme: B.Tech Electronics\nIntake: 90\nValid until: 2027-03-31','2027-03-31');
  add('doc-x2','app-mismatch','harbor-accreditation.txt','Accreditation / Certification','Accreditation Certificate\nInstitution: Harborview Technical University\nInstitution ID: INST-1004\nProgramme: B.Tech Electronics\nIntake: 90\nValid until: 2027-03-31','2027-03-31');
  add('doc-x3','app-mismatch','harbor-payment.txt','Payment Evidence','Payment Evidence\nInstitution ID: INST-1004\nTransaction: TER-DEMO-1004','2027-03-31');
  add('doc-d1','app-duplicate','juniper-certificate-a.txt','Accreditation / Certification','Accreditation Certificate\nInstitution: Juniper School of Business\nInstitution ID: INST-1005\nProgramme: MBA Digital Strategy\nIntake: 50\nValid until: 2027-03-31','2027-03-31');
  add('doc-d2','app-duplicate','juniper-certificate-copy.txt','Accreditation / Certification','Accreditation Certificate\nInstitution: Juniper School of Business\nInstitution ID: INST-1005\nProgramme: MBA Digital Strategy\nIntake: 50\nValid until: 2027-03-31\nPresented as a copy for synthetic anomaly testing.','2027-03-31',0.81);
  const insert = db.prepare('INSERT INTO documents (id,application_id,name,type,mime_type,size_bytes,sha256,storage_path,processing_status,extracted_text,extracted_fields,confidence,page_evidence,expiry_date,issued_date,issuing_authority,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const row of rows) insert.run(...row);
}

function seedAudit(db: ReturnType<typeof getDb>) {
  const insert = db.prepare('INSERT INTO audit_logs (id,user_id,user_name,role,action,entity_type,entity_id,before_value,after_value,metadata,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  insert.run('audit-1','u-admin','Vikram Sen','System Administrator','Seeded synthetic demo environment','system',null,null,null,JSON.stringify({demo:true}),now);
  insert.run('audit-2','u-officer','Ananya Rao','AICTE Officer/Reviewer','Validation completed','application','app-clean',JSON.stringify({status:'Processing'}),JSON.stringify({status:'Validation Completed'}),JSON.stringify({ruleVersion:'2026.1'}),now);
  insert.run('audit-3','u-analyst','Meera Iyer','Technical Analyst','Document processed','document','doc-d1',null,JSON.stringify({status:'Processed'}),JSON.stringify({ocr:'not available; text fixture'}),now);
}
