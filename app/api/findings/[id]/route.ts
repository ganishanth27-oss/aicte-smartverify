import { NextResponse } from 'next/server';
import { getSession, canReview } from '@/src/lib/auth';
import { updateFinding } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { const user = await getSession(); if (!canReview(user.role)) return NextResponse.json({ error: 'Only reviewers can update findings.' }, { status: 403 }); try { const { id } = await context.params; const body = await request.json(); return NextResponse.json({ finding: updateFinding(id, { status: body.status, reviewerComment: body.reviewerComment }, user) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update finding' }, { status: 400 }); } }
