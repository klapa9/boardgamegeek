import { getCurrentUserProfile } from '@/lib/user-profile';

type MinimalSession = {
  id: string;
  organizerUserProfileId: string | null;
};

export function viewerIsOrganizer(session: Pick<MinimalSession, 'organizerUserProfileId'> | null, viewerProfileId: string | null) {
  if (!session?.organizerUserProfileId || !viewerProfileId) return false;
  return session.organizerUserProfileId === viewerProfileId;
}

export async function ensureSessionOrganizerAccess(session: MinimalSession | null) {
  if (!session) {
    return { ok: false as const, reason: 'not_found' as const, viewerProfile: null };
  }

  const viewerProfile = await getCurrentUserProfile();
  const isOrganizer = viewerIsOrganizer(session, viewerProfile?.id ?? null);

  if (isOrganizer) {
    return { ok: true as const, isOrganizer, viewerProfile };
  }

  return { ok: false as const, reason: 'forbidden' as const, viewerProfile };
}
