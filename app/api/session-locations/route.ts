import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserProfile } from '@/lib/user-profile';

export async function GET() {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) return NextResponse.json({ locations: [] });

  const sessions = await prisma.session.findMany({
    where: {
      organizerUserProfileId: viewerProfile.id,
      meetingLocation: { not: null }
    },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: { meetingLocation: true }
  });

  const seen = new Set<string>();
  const locations: string[] = [];

  for (const session of sessions) {
    const location = session.meetingLocation?.trim();
    if (!location) continue;
    const key = location.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push(location);
    if (locations.length === 3) break;
  }

  return NextResponse.json({ locations });
}
