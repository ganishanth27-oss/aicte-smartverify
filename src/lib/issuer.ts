import crypto from 'node:crypto';
import type { IssuerResult } from './types';

export const scenarios = ['verified', 'mismatch', 'expired', 'pending', 'unavailable', 'manual_review'] as const;
export type IssuerScenario = typeof scenarios[number];

export function simulateIssuer(input: { applicationId: string; documentId?: string | null; scenario: IssuerScenario }) {
  const now = new Date().toISOString();
  const map: Record<IssuerScenario, { status: string; reason: string; discrepancies: string; matched: string }> = {
    verified: { status: 'Verified (simulated)', reason: 'Synthetic reference matched the demo issuer record.', discrepancies: '[]', matched: '["reference","institution","validity"]' },
    mismatch: { status: 'Mismatch detected (simulated)', reason: 'Synthetic source returned a different institution identifier.', discrepancies: '["institution_id"]', matched: '["reference","validity"]' },
    expired: { status: 'Expired (simulated)', reason: 'Synthetic issuer record is past its validity date.', discrepancies: '["validity"]', matched: '["reference","institution"]' },
    pending: { status: 'Verification pending (simulated)', reason: 'Synthetic provider accepted the request but has not returned a final response.', discrepancies: '[]', matched: '[]' },
    unavailable: { status: 'Source unavailable (simulated)', reason: 'The configured source is unavailable; no compliance conclusion can be drawn.', discrepancies: '[]', matched: '[]' },
    manual_review: { status: 'Manual review required (simulated)', reason: 'The synthetic response needs an authorized reviewer to inspect source evidence.', discrepancies: '["source_response"]', matched: '["reference"]' }
  };
  const result = map[input.scenario];
  return {
    id: `issuer-${crypto.randomUUID()}`,
    applicationId: input.applicationId,
    documentId: input.documentId || null,
    scenario: input.scenario,
    status: result.status,
    sourceName: 'SmartVerify Simulated Issuer Adapter',
    sourceReference: `SIM-${input.applicationId.slice(-8).toUpperCase()}`,
    provenance: 'Demo adapter response. No official government portal or issuer API was contacted.',
    matchedFields: result.matched,
    discrepancies: result.discrepancies,
    reason: result.reason,
    simulated: 1,
    checkedAt: now
  };
}
