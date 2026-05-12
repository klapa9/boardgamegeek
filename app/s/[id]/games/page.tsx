import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { sessionPath } from '@/lib/session-link';

export default async function AddSessionGamesPage({ params }: { params: { id: string } }) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { title: true }
  });

  redirect(sessionPath(params.id, session?.title));
}
