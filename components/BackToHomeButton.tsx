'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

function sessionDraftKey(editSessionId?: string | null) {
  return editSessionId ? `gsk-session-draft-${editSessionId}` : 'gsk-session-draft';
}

export default function BackToHomeButton({ editSessionId = null }: { editSessionId?: string | null }) {
  const router = useRouter();

  function handleClick() {
    const warningMessage = editSessionId
      ? 'Als je nu teruggaat naar de startpagina, worden je niet-opgeslagen wijzigingen verwijderd. Wil je verdergaan?'
      : 'Als je nu teruggaat naar de startpagina, worden je ingevoerde gegevens verwijderd. Wil je verdergaan?';

    if (!window.confirm(warningMessage)) {
      return;
    }

    localStorage.removeItem(sessionDraftKey(editSessionId));
    router.push('/');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
    >
      <ArrowLeft size={16} />
      Terug naar start
    </button>
  );
}
