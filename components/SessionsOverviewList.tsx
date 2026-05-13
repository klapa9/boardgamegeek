'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

type SessionGameSummary = {
  id: string;
};

type SessionRatingSummary = {
  playerId: string;
  gameId: string;
};

type SessionAvailabilitySummary = {
  playerId: string;
  day: string;
  available: boolean;
};

export type SessionOverviewListItem = {
  id: string;
  title: string;
  isOrganizer: boolean;
  chosenDay: string | null;
  createdAt: string;
  dateOptions: string[];
  playersCount: number;
  gamesCount: number;
  path: string;
  games: SessionGameSummary[];
  ratings: SessionRatingSummary[];
  availability: SessionAvailabilitySummary[];
};

type PersonalStatus = {
  hasJoined: boolean;
  missingRatings: number;
  needsDateChoice: boolean;
  needsChosenDateConfirmation: boolean;
};

function playerKey(sessionId: string) {
  return `gsk-player-${sessionId}`;
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T12:00:00`));
}

function toPersonalStatus(session: SessionOverviewListItem): PersonalStatus {
  if (typeof window === 'undefined') {
    return {
      hasJoined: false,
      missingRatings: 0,
      needsDateChoice: false,
      needsChosenDateConfirmation: false
    };
  }

  const myPlayerId = window.localStorage.getItem(playerKey(session.id));
  if (!myPlayerId) {
    return {
      hasJoined: false,
      missingRatings: 0,
      needsDateChoice: false,
      needsChosenDateConfirmation: false
    };
  }

  const ratedGameIds = new Set(
    session.ratings
      .filter((rating) => rating.playerId === myPlayerId)
      .map((rating) => rating.gameId)
  );
  const missingRatings = session.games.reduce((total, game) => total + (ratedGameIds.has(game.id) ? 0 : 1), 0);

  if (session.chosenDay) {
    const chosenDayVote = session.availability.find((item) => item.playerId === myPlayerId && item.day === session.chosenDay);
    return {
      hasJoined: true,
      missingRatings,
      needsDateChoice: false,
      needsChosenDateConfirmation: !chosenDayVote
    };
  }

  const hasAnyChosenDate = session.availability.some((item) => item.playerId === myPlayerId);
  return {
    hasJoined: true,
    missingRatings,
    needsDateChoice: !hasAnyChosenDate,
    needsChosenDateConfirmation: false
  };
}

export default function SessionsOverviewList({ sessions }: { sessions: SessionOverviewListItem[] }) {
  const router = useRouter();
  const [statusBySessionId, setStatusBySessionId] = useState<Record<string, PersonalStatus>>({});
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [hiddenSessionIds, setHiddenSessionIds] = useState<Record<string, true>>({});

  useEffect(() => {
    const nextStatuses: Record<string, PersonalStatus> = {};
    sessions.forEach((session) => {
      nextStatuses[session.id] = toPersonalStatus(session);
    });
    setStatusBySessionId(nextStatuses);
  }, [sessions]);

  async function deleteSession(event: React.MouseEvent<HTMLButtonElement>, session: SessionOverviewListItem) {
    event.preventDefault();
    event.stopPropagation();
    const confirmed = window.confirm(
      `Deze spelavond wordt definitief verwijderd.\n\n"${session.title}" en alle bijhorende planning, deelnemers en scores gaan onomkeerbaar verloren.\n\nWeet je zeker dat je wil doorgaan?`
    );
    if (!confirmed) return;

    setDeletingSessionId(session.id);
    try {
      await api(`/api/sessions/${session.id}`, { method: 'DELETE' });
      window.localStorage.removeItem(playerKey(session.id));
      setHiddenSessionIds((current) => ({ ...current, [session.id]: true }));
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Spelavond verwijderen mislukt.');
    } finally {
      setDeletingSessionId((current) => (current === session.id ? null : current));
    }
  }

  const decoratedSessions = useMemo(() => sessions.filter((session) => !hiddenSessionIds[session.id]).map((session) => {
    const status = statusBySessionId[session.id] ?? {
      hasJoined: false,
      missingRatings: 0,
      needsDateChoice: false,
      needsChosenDateConfirmation: false
    };
    const dateSummary = session.chosenDay
      ? `Vastgelegd op ${formatDisplayDate(session.chosenDay)}`
      : `${session.dateOptions.length} voorgestelde datum${session.dateOptions.length === 1 ? '' : 's'}`;
    return { session, status, dateSummary, isAdmin: session.isOrganizer };
  }), [hiddenSessionIds, sessions, statusBySessionId]);

  return (
    <div className="space-y-2">
      {decoratedSessions.map(({ session, status, dateSummary, isAdmin }) => (
        <div key={session.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
          <Link href={session.path} className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-lg font-black text-slate-900">{session.title}</p>
                {isAdmin && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                    Organisator
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {dateSummary} - {session.playersCount} deelnemer{session.playersCount === 1 ? '' : 's'} - {session.gamesCount} spel{session.gamesCount === 1 ? '' : 'len'}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Aangemaakt op {formatDisplayDate(session.createdAt.slice(0, 10))}
              </p>
              {status.hasJoined && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {status.missingRatings > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                      {status.missingRatings} spel{status.missingRatings === 1 ? '' : 'len'} nog beoordelen
                    </span>
                  )}
                  {status.needsDateChoice && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-900">
                      Nog geen datum gekozen
                    </span>
                  )}
                  {status.needsChosenDateConfirmation && (
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-900">
                      Datum nog niet bevestigd
                    </span>
                  )}
                </div>
              )}
            </div>
            <ChevronRight size={20} className="shrink-0 text-slate-500" />
          </Link>
          {isAdmin && (
            <button
              type="button"
              onClick={(event) => void deleteSession(event, session)}
              disabled={deletingSessionId === session.id}
              className="shrink-0 rounded-xl border border-red-200 bg-white p-2 text-red-700 disabled:opacity-50"
              title="Spelavond definitief verwijderen"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
