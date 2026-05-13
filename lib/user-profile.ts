import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '@clerk/backend';
import { prisma } from '@/lib/db';

function emailHandle(user: Pick<User, 'emailAddresses' | 'primaryEmailAddressId'>) {
  const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
  const fallback = primary ?? user.emailAddresses[0];
  const address = fallback?.emailAddress?.trim();
  if (!address) return null;
  return address.split('@')[0]?.trim() || null;
}

export function defaultDisplayNameFromClerkUser(user: Pick<User, 'firstName' | 'lastName' | 'username' | 'emailAddresses' | 'primaryEmailAddressId'>) {
  const fullName = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(' ').trim();
  const username = user.username?.trim() || null;
  const handle = emailHandle(user);

  return fullName || username || handle || 'Speler';
}

export async function getOrCreateUserProfile(clerkUserId: string) {
  const clerkUser = await currentUser();
  const displayName = clerkUser ? defaultDisplayNameFromClerkUser(clerkUser) : 'Speler';

  return prisma.userProfile.upsert({
    where: { clerkUserId },
    update: {},
    create: {
      clerkUserId,
      displayName
    }
  });
}

export async function getCurrentUserProfile() {
  const { userId } = await auth();
  if (!userId) return null;
  return getOrCreateUserProfile(userId);
}
