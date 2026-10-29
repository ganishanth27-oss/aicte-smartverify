import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/auth';
import { ensureSeeded, publicMonitoringStats } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  ensureSeeded();
  const url = new URL(request.url);
  const stats = publicMonitoringStats();
  if (url.searchParams.get('scope') === 'government') {
    const user = await getSession();
    if (!['System Administrator', 'AICTE Officer/Reviewer', 'Technical Analyst', 'Read-only Auditor'].includes(user.role)) return NextResponse.json({ error: 'Government authorization is required.' }, { status: 403 });
  }
  return NextResponse.json({ stats, demo: true, publicSafe: url.searchParams.get('scope') !== 'government' });
}
