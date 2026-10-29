import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, sessionCookieName } from '@/src/lib/auth';
import { ensureSeeded } from '@/src/lib/repository';
import { roles, type Role } from '@/src/lib/types';
import { getDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export async function GET() { ensureSeeded(); const store = await cookies(); const active = store.get(sessionCookieName())?.value; return NextResponse.json({ user: active ? await getSession() : null, demo: true }); }
export async function POST(request: Request) {
  ensureSeeded();
  const body = await request.json().catch(() => ({}));
  const role = body.role as Role;
  if (!roles.includes(role)) return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  const user = getDb().prepare('SELECT id,name,email,role,institution_id as institutionId FROM users WHERE role = ? AND active = 1 ORDER BY id LIMIT 1').get(role) as { id: string; name: string; email: string; role: Role; institutionId: string | null };
  const store = await cookies();
  store.set(sessionCookieName(), user.id, { httpOnly: true, sameSite: 'none', secure: true, path: '/', maxAge: 60 * 60 * 8 });
  return NextResponse.json({ user, demo: true });
}
export async function DELETE() { const store = await cookies(); store.set(sessionCookieName(), '', { httpOnly: true, sameSite: 'none', secure: true, path: '/', maxAge: 0 }); return NextResponse.json({ ok: true }); }
