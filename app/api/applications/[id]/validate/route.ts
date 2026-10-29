import { NextResponse } from 'next/server';
import { getSession, canReview } from '@/src/lib/auth';
import { ensureSeeded, validateApplication } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) { const user = await getSession(); if (!canReview(user.role)) return NextResponse.json({ error: 'Only reviewers can run validation.' }, { status: 403 }); ensureSeeded(); try { const { id } = await context.params; return NextResponse.json({ application: validateApplication(id, user) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Validation failed' }, { status: 400 }); } }
