import Link from 'next/link';
import { Inbox, MessageSquareMore, UserRound } from 'lucide-react';
import { notFound } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { privatePageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('nl-BE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

export default async function AdminFeedbackPage() {
  if (!(await isCurrentUserAdmin())) {
    notFound();
  }

  const feedbackRequests = await prisma.feedbackRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      userProfile: {
        select: {
          displayName: true,
          clerkUserId: true
        }
      }
    },
    take: 200
  });

  const uniqueAuthors = new Set(feedbackRequests.map((entry) => entry.userProfileId)).size;

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
        <header className="page-card page-card-sky p-5 sm:p-6">
          <Link href="/" className="neo-button neo-button-ghost text-sm">
            {'<-'} Terug naar start
          </Link>
          <p className="page-chip mt-4 w-fit">Admin</p>
          <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">
            Feedback inbox
          </h1>
          <p className="mt-3 max-w-3xl text-slate-700">
            Hier zie je ideeen, feature-aanvragen en bugmeldingen die ingelogde gebruikers via de startpagina hebben doorgestuurd.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="page-subcard p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Totaal getoond</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{feedbackRequests.length}</p>
            </div>
            <div className="page-subcard p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Unieke inzenders</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{uniqueAuthors}</p>
            </div>
            <div className="page-subcard p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nieuwste melding</p>
              <p className="mt-2 text-sm font-black text-slate-950">
                {feedbackRequests[0] ? formatDate(feedbackRequests[0].createdAt) : 'Nog geen meldingen'}
              </p>
            </div>
          </div>
        </header>

        <section className="page-card p-5 sm:p-6">
          {!feedbackRequests.length ? (
            <div className="page-subcard flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
              <Inbox size={28} className="text-slate-500" />
              <div>
                <p className="text-lg font-black text-slate-950">Nog geen meldingen</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Zodra gebruikers iets insturen verschijnt het hier automatisch.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {feedbackRequests.map((request) => (
                <article key={request.id} className="page-subcard overflow-hidden">
                  <div className="flex flex-col gap-3 border-b-2 border-slate-950/10 bg-[#fffdf8] px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                        <UserRound size={16} className="shrink-0" />
                        <span>{request.userProfile.displayName}</span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                        Clerk user id: {request.userProfile.clerkUserId}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                      <MessageSquareMore size={15} className="shrink-0" />
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{request.message}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
