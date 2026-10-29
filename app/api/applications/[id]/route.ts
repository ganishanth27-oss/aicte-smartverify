import { NextResponse } from 'next/server';
import { getSession, canEdit } from '@/src/lib/auth';
import { ensureSeeded, getApplicationForUser, updateApplication } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { ensureSeeded(); const user = await getSession(); const { id } = await context.params; const application = getApplicationForUser(id, user); return application ? NextResponse.json({ application }) : NextResponse.json({ error: 'Application not found' }, { status: 404 }); }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { const user = await getSession(); if (!canEdit(user.role)) return NextResponse.json({ error: 'Read-only role cannot change applications.' }, { status: 403 }); try { const { id } = await context.params; return NextResponse.json({ application: updateApplication(id, await request.json(), user) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update application' }, { status: 400 }); } }
