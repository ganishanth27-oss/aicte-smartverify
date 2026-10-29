import { NextResponse } from 'next/server';
import { getSession, canEdit } from '@/src/lib/auth';
import { ensureSeeded, uploadDocument } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!canEdit(user.role)) return NextResponse.json({ error: 'Read-only role cannot upload documents.' }, { status: 403 });
  ensureSeeded(); const { id } = await context.params;
  try { const form = await request.formData(); const file = form.get('file'); if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 }); const result = await uploadDocument(id, { name: file.name, mime: file.type || 'application/octet-stream', buffer: Buffer.from(await file.arrayBuffer()) }, user); return NextResponse.json({ document: result }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Document processing failed' }, { status: 400 }); }
}
