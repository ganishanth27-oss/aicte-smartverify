import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { DocumentRecord } from './types';
import { getDb } from './db';

const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024;
const allowed = new Set(['application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'application/json']);

export function validateUpload(name: string, mime: string, size: number) {
  const ext = path.extname(name).toLowerCase();
  const safeExt = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.json']);
  if (!safeExt.has(ext) || !allowed.has(mime)) throw new Error('Unsupported file type. Use PDF, PNG, JPG, JPEG, TXT, or JSON.');
  if (size <= 0 || size > MAX_BYTES) throw new Error(`File must be smaller than ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
}

export function sha256(buffer: Buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
export function classifyDocument(name: string, text: string) {
  const value = `${name} ${text}`.toLowerCase();
  if (value.includes('accredit') || value.includes('naac') || value.includes('nba')) return 'Accreditation / Certification';
  if (value.includes('affidavit') || value.includes('undertaking')) return 'Affidavit / Undertaking';
  if (value.includes('faculty') || value.includes('professor')) return 'Faculty Records';
  if (value.includes('payment') || value.includes('transaction') || value.includes('ter')) return 'Payment Evidence';
  if (value.includes('noc') || value.includes('permission')) return 'NOC / Permission';
  if (value.includes('previous approval') || value.includes('eoa') || value.includes('approval letter')) return 'Previous Approval';
  if (value.includes('floor plan') || value.includes('built-up')) return 'Floor Plan';
  if (value.includes('photo') || value.includes('campus')) return 'Photograph';
  if (value.includes('infrastructure') || value.includes('laboratory')) return 'Infrastructure Document';
  return 'Other';
}

export function extractFields(text: string) {
  const normalized = text.replace(/\r/g, ' ');
  const find = (pattern: RegExp) => normalized.match(pattern)?.[1]?.trim() || null;
  const institutionName = find(/(?:institution|college|university)\s*[:\-]\s*([^\n,;]+)/i);
  const institutionId = find(/(?:institution\s*(?:id|identifier)|aishe|id)\s*[:\-]\s*([A-Z0-9\-/]+)/i);
  const programme = find(/(?:programme|program|course)\s*[:\-]\s*([^\n,;]+)/i);
  const intakeRaw = find(/(?:intake|approved seats|seats)\s*[:\-]\s*(\d{1,5})/i);
  const authority = find(/(?:issued by|issuing authority|authority)\s*[:\-]\s*([^\n,;]+)/i);
  const issuedDate = find(/(?:issued|issue date)\s*[:\-]\s*(\d{4}[\/-]\d{2}[\/-]\d{2}|\d{2}[\/-]\d{2}[\/-]\d{4})/i);
  const expiryDate = find(/(?:valid until|validity|expiry|expires)\s*[:\-]\s*(\d{4}[\/-]\d{2}[\/-]\d{2}|\d{2}[\/-]\d{2}[\/-]\d{4})/i);
  return { institutionName, institutionId, programme, requestedIntake: intakeRaw ? Number(intakeRaw) : null, issuingAuthority: authority, issuedDate, expiryDate };
}

export function parseDate(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\//g, '-');
  const [a, b, c] = normalized.split('-');
  if (!a || !b || !c) return null;
  const iso = a.length === 4 ? `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}` : `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export async function processUpload(input: { applicationId: string; name: string; mime: string; buffer: Buffer; uploadedBy: string }) {
  validateUpload(input.name, input.mime, input.buffer.length);
  const hash = sha256(input.buffer);
  const existing = getDb().prepare('SELECT id FROM documents WHERE application_id = ? AND sha256 = ?').get(input.applicationId, hash) as { id: string } | undefined;
  if (existing) throw new Error('Exact duplicate detected: this file is already attached to the application.');
  const text = input.mime === 'text/plain' || input.mime === 'application/json' ? input.buffer.toString('utf8') : input.mime === 'application/pdf' ? extractPdfText(input.buffer) : 'OCR unavailable in demo runtime; image retained for reviewer inspection.';
  const fields = extractFields(text);
  const type = classifyDocument(input.name, text);
  const id = `doc-${crypto.randomUUID()}`;
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const storedName = `${id}-${input.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storagePath = path.join(uploadDir, storedName);
  await fs.writeFile(storagePath, input.buffer);
  const now = new Date().toISOString();
  getDb().prepare(`INSERT INTO documents (id, application_id, name, type, mime_type, size_bytes, sha256, storage_path, processing_status, extracted_text, extracted_fields, confidence, page_evidence, expiry_date, issued_date, issuing_authority, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.applicationId, input.name, type, input.mime, input.buffer.length, hash, storagePath, 'Processed', text, JSON.stringify(fields), input.mime.startsWith('image/') ? 0.67 : 0.94, JSON.stringify([{ page: 1, text: text.slice(0, 300) }]), parseDate(fields.expiryDate), parseDate(fields.issuedDate), fields.issuingAuthority, input.uploadedBy, now);
  const row = getDb().prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRecord & { extracted_fields: string; page_evidence: string };
  return { ...row, extracted_fields: JSON.parse(row.extracted_fields), page_evidence: JSON.parse(row.page_evidence) } as DocumentRecord;
}

function extractPdfText(buffer: Buffer) {
  const raw = buffer.toString('latin1');
  const strings = raw.match(/[\x20-\x7E]{4,}/g) || [];
  const text = strings.filter((item) => !item.includes('obj') && !item.includes('endstream')).join(' ');
  return text || 'Scanned PDF retained; OCR dependency is not available in this demo runtime.';
}
