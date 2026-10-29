export type Role = 'System Administrator' | 'AICTE Officer/Reviewer' | 'Technical Analyst' | 'Institution Applicant' | 'Read-only Auditor';
export type ApplicationStatus = 'Draft' | 'Submitted' | 'Processing' | 'Validation Completed' | 'Rectification Required' | 'Manual Review Required' | 'Officer Review' | 'Decision Pending';
export type FindingStatus = 'Open' | 'Acknowledged' | 'Resolved' | 'Escalated';

export type SessionUser = { id: string; name: string; email: string; role: Role; institutionId?: string | null };
export type Application = {
  id: string; reference: string; institution_name: string; institution_id: string; category: string;
  academic_session: string; programme: string; requested_intake: number; faculty: string | null;
  previous_approval: string | null; payment_status: string; payment_reference: string | null;
  status: ApplicationStatus; assigned_reviewer: string | null; applicant_user_id: string | null;
  created_at: string; updated_at: string; document_count?: number; open_findings?: number;
};
export type DocumentRecord = {
  id: string; application_id: string; name: string; type: string; mime_type: string;
  size_bytes: number; sha256: string; storage_path: string; processing_status: string;
  extracted_text: string | null; extracted_fields: Record<string, unknown>; confidence: number | null;
  page_evidence: Array<{ page: number; text: string }>; expiry_date: string | null;
  issued_date: string | null; issuing_authority: string | null; uploaded_by: string; created_at: string;
};
export type Finding = {
  id: string; application_id: string; document_id: string | null; category: string; severity: string;
  title: string; explanation: string; evidence: string; detection_method: string; confidence: number | null;
  next_step: string; status: FindingStatus; reviewer_comment: string | null; page_number: number | null;
  field_name: string | null; created_at: string; updated_at: string;
};
export type IssuerResult = {
  id: string; application_id: string; document_id: string | null; scenario: string; status: string;
  source_name: string; source_reference: string; provenance: string; matched_fields: string;
  discrepancies: string; reason: string; simulated: number; checked_at: string;
};
export type DashboardStats = {
  total: number; pendingValidation: number; manualReview: number; missingDocuments: number;
  expiredDocuments: number; inconsistencies: number; anomalies: number; awaitingOfficer: number;
  verified: number; pendingIssuer: number; statusDistribution: Array<{ status: string; count: number }>;
  recentAudit: Array<Record<string, unknown>>;
};
export type PublicCaseStatus = 'Received' | 'Pending' | 'Under Process' | 'Disposed' | 'Transferred' | 'Escalated';
export type PublicCaseAction = { id: string; case_id: string; bureau: string; officer: string | null; action: string; remarks: string; supporting_documents: number; created_at: string };
export type PublicCase = {
  id: string; case_reference: string; access_code?: string; complainant_name?: string; complainant_email?: string;
  complainant_phone?: string | null; institution_name: string; institution_id: string | null; region: string;
  category: string; description?: string; bureau: string; assigned_officer: string | null;
  status: PublicCaseStatus; last_action: string; next_action: string; received_at: string;
  last_action_at: string; expected_disposal_date: string | null; updated_at: string;
  overlap_flag?: boolean; related_case_references?: string[]; actions?: PublicCaseAction[];
};
export type PublicMonitoringStats = {
  total: number; pending: number; underProcess: number; disposed: number; transferred: number;
  escalated: number; overdue: number; overlapCount: number;
  byBureau: Array<{ bureau: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
};
export const DEMO_BANNER = 'DEMO ENVIRONMENT — SYNTHETIC DATA — NOT AN OFFICIAL AICTE SYSTEM.';
export const roles: Role[] = ['System Administrator', 'AICTE Officer/Reviewer', 'Technical Analyst', 'Institution Applicant', 'Read-only Auditor'];
export const categories = ['Extension of Approval', 'Change in Intake', 'New Programme', 'Institutional Change'];
export const documentTypes = ['Affidavit / Undertaking', 'Accreditation / Certification', 'NOC / Permission', 'Previous Approval', 'Faculty Records', 'Payment Evidence', 'Infrastructure Document', 'Floor Plan', 'Photograph', 'Other'];
export const statusOptions: ApplicationStatus[] = ['Draft', 'Submitted', 'Processing', 'Validation Completed', 'Rectification Required', 'Manual Review Required', 'Officer Review', 'Decision Pending'];

export function jsonValue(value: unknown) {
  return JSON.stringify(value ?? null);
}
export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return (value as T) ?? fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
