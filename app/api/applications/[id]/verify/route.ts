import { NextResponse } from 'next/server';
import { getSession, canReview } from '@/src/lib/auth';
import { ensureSeeded, runIssuerVerification } from '@/src/lib/repository';
import { scenarios, type IssuerScenario } from '@/src/lib/issuer';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { const user = await getSession(); if (!canReview(user.role)) return NextResponse.json({ error: 'Only reviewers can run verification.' }, { status: 403 }); ensureSeeded(); const body = await request.json().catch(() => ({})); const scenario = body.scenario as IssuerScenario; if (!scenarios.includes(scenario)) return NextResponse.json({ error: 'Choose a supported simulated scenario.' }, { status: 400 }); try { const { id } = await context.params; return NextResponse.json({ result: runIssuerVerification(id, body.documentId || null, scenario, user) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Verification failed' }, { status: 400 }); } }
