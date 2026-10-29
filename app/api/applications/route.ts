import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/auth';
import { createApplication, ensureSeeded, listApplications } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) { const user = await getSession(); ensureSeeded(); const url = new URL(request.url); return NextResponse.json({ applications: listApplications({ q: url.searchParams.get('q') || '', status: url.searchParams.get('status') || 'All', category: url.searchParams.get('category') || 'All', user }) }); }
export async function POST(request: Request) { try { const user = await getSession(); const body = await request.json(); return NextResponse.json({ application: createApplication(body, user) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create application' }, { status: 400 }); } }
