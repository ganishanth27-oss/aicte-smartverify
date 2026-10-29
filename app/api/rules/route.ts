import { NextResponse } from 'next/server';
import { getSession, canAdmin } from '@/src/lib/auth';
import { createRule, ensureSeeded, listRules } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';
export async function GET() { ensureSeeded(); return NextResponse.json({ rules: listRules() }); }
export async function POST(request: Request) { const user = await getSession(); if (!canAdmin(user.role)) return NextResponse.json({ error: 'Administrator role required.' }, { status: 403 }); try { return NextResponse.json({ rule: createRule(await request.json(), user) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create rule' }, { status: 400 }); } }
