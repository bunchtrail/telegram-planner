import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
};

export async function POST(request: Request) {
  const expectedSecret = process.env.REMINDERS_RUN_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'Reminder runner is not configured' },
      { status: 501, headers: NO_STORE_HEADERS }
    );
  }

  const providedSecret = request.headers.get('x-reminders-secret');
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      processed: 0,
      message: 'Reminder runner is available but not configured to send reminders yet',
    },
    { headers: NO_STORE_HEADERS }
  );
}
