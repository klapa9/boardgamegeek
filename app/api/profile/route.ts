import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeUserProfile } from '@/lib/serializers';
import { getOrCreateUserProfile } from '@/lib/user-profile';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Je moet eerst inloggen om je profiel te beheren.' }, { status: 401 });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return unauthorizedResponse();

  const profile = await getOrCreateUserProfile(userId);
  return NextResponse.json({ profile: serializeUserProfile(profile) });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const displayName = String(body.display_name ?? '').trim();

  if (!displayName) {
    return NextResponse.json({ error: 'Displaynaam is verplicht.' }, { status: 400 });
  }

  const profile = await getOrCreateUserProfile(userId);
  const updatedProfile = await prisma.userProfile.update({
    where: { id: profile.id },
    data: { displayName }
  });

  await prisma.player.updateMany({
    where: { userProfileId: profile.id },
    data: { name: displayName }
  });

  return NextResponse.json({ profile: serializeUserProfile(updatedProfile) });
}
