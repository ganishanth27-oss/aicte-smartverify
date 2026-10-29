import { NextResponse } from 'next/server';
import { getSession, canReview } from '@/src/lib/auth';
import { addInfrastructureObservation, ensureSeeded, listInfrastructure } from '@/src/lib/repository';
export const dynamic = 'force-dynamic';
export async function GET() { ensureSeeded(); return NextResponse.json({ items: listInfrastructure() }); }
export async function POST(request: Request) { const user = await getSession(); if (!canReview(user.role)) return NextResponse.json({ error: 'Reviewer role required.' }, { status: 403 }); try { return NextResponse.json({ observation: addInfrastructureObservation(await request.json(), user) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save observation' }, { status: 400 }); } }
