'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Dice5, Users } from 'lucide-react';
import { loadSessionBundle } from '@/lib/api';
import { sessionPath } from '@/lib/session-link';
import { SessionBundle } from '@/lib/types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T12:00:00`));
}

function formatMeetingTime(value: string) {
  const [hours, minutes] = value.split(':');
  if (!hours || !minutes) return value;
  return minutes === '00' ? `${Number(hours)}u` : `${Number(hours)}u${minutes}`;
}

function planningSummary(bundle: SessionBundle) {
  const { session } = bundle;
  if (session.planning_mode === 'fixed_day') {
    const fixedDate = session.chosen_day ?? session.date_options[0]?.date ?? null;
    return fixedDate ? `1 vaste dag: ${formatDate(fixedDate)}` : '1 vaste dag';
  }

  const optionCount = session.date_options.length;
  return `${optionCount} datumoptie${optionCount === 1 ? '' : 's'} om op te stemmen`;
}

function gameSummary(bundle: SessionBundle) {
  const { session, games } = bundle;
  if (session.game_selection_mode === 'no_preselect') {
    return 'Geen spel ligt vooraf vast';
  }

  if (session.game_selection_mode === 'host_pick') {
    return games.length === 1 ? `1 spel ligt vooraf vast: ${games[0].title}` : 'De organisator kiest vooraf 1 spel';
  }

  return `${games.length} speloptie${games.length === 1 ? '' : 's'} om op te stemmen`;
}

function nextStepText(bundle: SessionBundle) {
  if (bundle.session.game_selection_mode === 'players_pick') {
    return 'Vul nu zelf je planning en spelkeuze in.';
  }

  return 'Vul nu zelf je planning in.';
}

export default function SessionCreatedOverview({ sessionId }: { sessionId: string }) {
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await loadSessionBundle(sessionId);
        if (cancelled) return;

        if (!data.viewer_is_organizer) {
          setError('Alleen de organisator kan dit succesoverzicht bekijken.');
          return;
        }

        setBundle(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Spelavond laden mislukt.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return <div className="neo-muted-panel mt-8 text-sm text-slate-500">Spelavond laden...</div>;
  }

  if (error || !bundle) {
    return (
      <div className="mt-8 space-y-4">
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error ?? 'Spelavond niet gevonden.'}</p>
        <Link href="/spelavonden" className="neo-button neo-button-primary w-full">
          Naar mijn spelavonden
        </Link>
      </div>
    );
  }

  const { session } = bundle;
  const title = session.title.trim() || 'Spelavond';
  const sessionHref = sessionPath(session.id, title);

  return (
    <div className="mt-8 space-y-5">
      <div>
        <p className="page-chip w-fit">Nieuwe spelavond</p>
        <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 md:text-6xl">
          Stap 4: {title} is aangemaakt!
        </h1>
      </div>

      <section className="page-subcard p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <CheckCircle2 size={26} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ingesteld door de organisator</p>
            <p className="mt-1 text-sm text-slate-700">Zo staat je spelavond nu klaar voor de rest van de groep.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="page-subcard-soft p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Users size={18} />
              <p className="text-sm font-bold">Planning</p>
            </div>
            <p className="mt-2 text-sm text-slate-700">{planningSummary(bundle)}</p>
          </article>

          <article className="page-subcard-soft p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Dice5 size={18} />
              <p className="text-sm font-bold">Spelkeuze</p>
            </div>
            <p className="mt-2 text-sm text-slate-700">{gameSummary(bundle)}</p>
          </article>

          <article className="page-subcard-soft p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Clock3 size={18} />
              <p className="text-sm font-bold">Afspreekuur</p>
            </div>
            <p className="mt-2 text-sm text-slate-700">{formatMeetingTime(session.meeting_time)}</p>
          </article>
        </div>
      </section>

      <section className="page-subcard p-5 text-sm text-slate-700">
        <p>
          De andere deelnemers kan je een link sturen. Zij kunnen dan alles invullen zonder hiervoor ingelogd te moeten zijn op deze site.
        </p>
        <p className="mt-4">
          Enkel jij, als organisator, kan het afspreekuur wijzigen en de dag of het spel vastleggen zodra je beslist dat er niet langer gestemd hoeft te worden.
        </p>
        <p className="mt-4">
          {nextStepText(bundle)} Daarna kan je {title} delen met wie je wilt via je communicatieplatform naar keuze.
        </p>
      </section>

      <Link href={sessionHref} className="neo-button neo-button-primary w-full">
        Ga naar {title}
      </Link>
    </div>
  );
}
