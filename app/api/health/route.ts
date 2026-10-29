import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const row = getDb().prepare('SELECT 1 as ok').get() as { ok: number };
    return NextResponse.json({ ok: row.ok === 1, service: 'smartverify', mode: 'demo', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'database unavailable' }, { status: 503 });
  }
}
