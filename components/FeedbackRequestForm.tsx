'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bug, Lightbulb } from 'lucide-react';
import { api } from '@/lib/api';

const MAX_MESSAGE_LENGTH = 1000;

type FeedbackResponse = {
  ok: boolean;
  duplicate?: boolean;
  message: string;
};

type FeedbackRequestFormProps = {
  isAdmin?: boolean;
};

export default function FeedbackRequestForm({ isAdmin = false }: FeedbackRequestFormProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextMessage = String(formData.get('message') ?? '').trim();
    const company = String(formData.get('company') ?? '').trim();

    if (!nextMessage) {
      setError('Vul eerst je idee of bug in.');
      setSuccess(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api<FeedbackResponse>('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          message: nextMessage,
          company
        })
      });

      setSuccess(response.message);
      setMessage('');
      form.reset();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Je melding verzenden mislukte.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-white shadow-[0_18px_50px_rgba(23,32,54,0.14)]">
      <div className="page-band px-4 py-4 sm:px-6 sm:py-5">
        <div className="max-w-3xl">
          <p className="page-chip w-fit">Idee of bug doorgeven</p>
          <h2 className="mt-4 font-poster text-[clamp(1.9rem,7vw,3.2rem)] uppercase leading-[0.95] text-slate-950">
            We horen graag wat beter kan.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
            Goede ideeen, kleine frustraties en bugmeldingen zijn hier heel welkom. We bekijken alle inzendingen
            graag en pakken goede verbeteringen of problemen zo snel mogelijk op.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="feedback-company">Bedrijfsnaam</label>
          <input id="feedback-company" name="company" type="text" autoComplete="off" tabIndex={-1} />
        </div>

        <label htmlFor="feedback-message" className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
          Jouw idee of bug
        </label>
        <textarea
          id="feedback-message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={submitting}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={6}
          placeholder="Bijvoorbeeld: het zou handig zijn als ..."
          className="neo-input mt-2 min-h-[10rem] resize-y whitespace-pre-wrap text-sm leading-6 disabled:opacity-60"
        />

        <div className="mt-2 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>Een korte omschrijving is genoeg. We lezen alles manueel na.</p>
          <p>{message.trim().length}/{MAX_MESSAGE_LENGTH}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="page-subcard flex items-start gap-3 p-4">
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-[#8f3a22]" />
            <p className="text-sm leading-6 text-slate-700">Nieuwe functies, slimme verbeteringen en kleine UX-ideeen zijn allemaal welkom.</p>
          </div>
          <div className="page-subcard flex items-start gap-3 p-4">
            <Bug size={18} className="mt-0.5 shrink-0 text-[#2f5a53]" />
            <p className="text-sm leading-6 text-slate-700">Zie je een fout of loopt iets vast? Zet het hier meteen door zodat we het kunnen nakijken.</p>
          </div>
        </div>

        {success ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="neo-button neo-button-primary disabled:opacity-50"
          >
            {submitting ? 'Versturen...' : 'Verstuur melding'}
          </button>

          {isAdmin ? (
            <Link href="/admin/feedback" className="neo-button neo-button-ghost">
              Bekijk adminoverzicht
            </Link>
          ) : null}
        </div>
      </form>
    </section>
  );
}
