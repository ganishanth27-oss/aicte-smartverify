import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/auth';
import { dashboardStats, ensureSeeded } from '@/src/lib/repository';
export const dynamic = 'force-dynamic';
export async function GET() { ensureSeeded(); return NextResponse.json({ stats: dashboardStats(await getSession()) }); }
