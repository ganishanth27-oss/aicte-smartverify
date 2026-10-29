import { cookies } from 'next/headers';
import { getDb } from './db';
import type { Role, SessionUser } from './types';

const COOKIE = 'smartverify_demo_session';
const FALLBACK: SessionUser = { id: 'u-officer', name: 'Ananya Rao', email: 'ananya.rao@demo.gov', role: 'AICTE Officer/Reviewer', institutionId: null };

export async function getSession(): Promise<SessionUser> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value || 'u-officer';
  const row = getDb().prepare('SELECT id, name, email, role, institution_id as institutionId FROM users WHERE id = ? AND active = 1').get(id) as SessionUser | undefined;
  return row || FALLBACK;
}

export function sessionCookieName() { return COOKIE; }
export function canEdit(role: Role) { return role !== 'Read-only Auditor'; }
export function canAdmin(role: Role) { return role === 'System Administrator'; }
export function canReview(role: Role) { return role === 'System Administrator' || role === 'AICTE Officer/Reviewer' || role === 'Technical Analyst'; }

export function assertRole(user: SessionUser, allowed: Role[]) {
  if (!allowed.includes(user.role)) {
    const error = new Error('FORBIDDEN');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

export function visibleApplicationFilter(user: SessionUser) {
  return user.role === 'Institution Applicant' ? { clause: 'a.applicant_user_id = ?', params: [user.id] } : { clause: '1 = 1', params: [] };
}
