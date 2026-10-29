import { NextResponse } from 'next/server';
import { ensureSeeded, listAudit } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) { ensureSeeded(); const q = new URL(request.url).searchParams.get('q') || ''; return NextResponse.json({ audit: listAudit(q) }); }
