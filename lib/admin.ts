import { auth, currentUser } from '@clerk/nextjs/server';

function parseCsv(value: string | undefined) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

function configuredAdminUserIds() {
  return parseCsv(process.env.ADMIN_CLERK_USER_IDS);
}

function configuredAdminEmails() {
  return parseCsv(process.env.ADMIN_EMAILS).map((entry) => entry.toLowerCase());
}

export async function isCurrentUserAdmin(clerkUserId?: string | null) {
  const resolvedUserId = clerkUserId ?? (await auth()).userId;
  if (!resolvedUserId) return false;

  if (configuredAdminUserIds().includes(resolvedUserId)) {
    return true;
  }

  const adminEmails = configuredAdminEmails();
  if (!adminEmails.length) {
    return false;
  }

  const user = await currentUser();
  if (!user) return false;

  return user.emailAddresses.some((email) => adminEmails.includes(email.emailAddress.toLowerCase()));
}
