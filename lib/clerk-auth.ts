import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const UNAUTHORIZED_MESSAGE = 'Je moet eerst inloggen om deze actie uit te voeren.';

export async function requireSignedInUser() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
  }

  return null;
}
