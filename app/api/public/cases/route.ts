import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/auth';
import { createPublicCase, ensureSeeded, listPublicCases, trackPublicCase } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  ensureSeeded();
  const url = new URL(request.url);
  if (url.searchParams.get('view') === 'government') {
    try {
      const user = await getSession();
      const cases = listPublicCases({ user, q: url.searchParams.get('q') || undefined, bureau: url.searchParams.get('bureau') || undefined, region: url.searchParams.get('region') || undefined, status: url.searchParams.get('status') || undefined, category: url.searchParams.get('category') || undefined });
      return NextResponse.json({ cases });
    } catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === 'FORBIDDEN' ? 'Government authorization is required.' : 'Unable to load cases.' }, { status: 403 }); }
  }
  const reference = url.searchParams.get('caseReference');
  const email = url.searchParams.get('email');
  if (!reference || !email) return NextResponse.json({ error: 'Enter a case reference and the email used when submitting it.' }, { status: 400 });
  const result = trackPublicCase(reference, email);
  return result ? NextResponse.json({ case: result }) : NextResponse.json({ error: 'No case matched that reference and email.' }, { status: 404 });
}

export async function POST(request: Request) {
  ensureSeeded();
  try { return NextResponse.json({ acknowledgement: createPublicCase(await request.json()) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to submit complaint.' }, { status: 400 }); }
}
