'use client';

import { useEffect, useState } from 'react';
import { SignedIn, useClerk, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { UserRound, X } from 'lucide-react';
import { api } from '@/lib/api';
import { UserProfileDto } from '@/lib/types';

export default function ProfileLauncher() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;

    api<{ profile: UserProfileDto }>('/api/profile')
      .then((data) => {
        setProfile(data.profile);
        setDisplayName(data.profile.display_name);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Profiel laden mislukt.'))
      .finally(() => setLoading(false));
  }, [isLoaded, user]);

  if (pathname.startsWith('/sign-in')) return null;

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      setError('Displaynaam is verplicht.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const data = await api<{ profile: UserProfileDto }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: nextDisplayName })
      });
      setProfile(data.profile);
      setDisplayName(data.profile.display_name);
      setMessage('Profiel opgeslagen.');
      window.dispatchEvent(new CustomEvent('gsk-profile-updated'));
      window.setTimeout(() => setOpen(false), 250);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profiel opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    setMessage(null);

    try {
      await signOut({ redirectUrl: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uitloggen mislukt.');
      setSigningOut(false);
    }
  }

  const fallbackLabel = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'Profiel';
  const buttonLabel = profile?.display_name || fallbackLabel;

  return (
    <SignedIn>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 py-4">
        <div className="mx-auto flex max-w-6xl justify-end">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="neo-button neo-button-secondary pointer-events-auto rounded-full bg-[rgba(132,215,255,0.95)] px-4 py-2.5 text-sm font-black shadow-soft backdrop-blur"
          >
            <UserRound size={17} />
            <span className="max-w-[10rem] truncate">{buttonLabel}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
          <div className="page-card page-card-sky w-full max-w-lg overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]">
            <div className="page-band flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Profiel</p>
                <h2 id="profile-modal-title" className="mt-1 font-poster text-3xl uppercase leading-none text-slate-950">Jouw displaynaam</h2>
                <p className="mt-1 text-sm text-slate-700">Deze naam gebruiken we automatisch wanneer je meedoet aan een spelavond.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={saving || signingOut} className="neo-button neo-button-ghost p-3 text-slate-600 disabled:opacity-50" title="Sluiten">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProfile} className="px-5 py-4">
              <label className="text-sm font-bold text-slate-700" htmlFor="profile-display-name">Displaynaam</label>
              <input
                id="profile-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={loading || saving || signingOut}
                className="neo-input mt-2 disabled:opacity-60"
                placeholder="Jouw naam"
              />
              <p className="mt-2 text-sm text-slate-600">Standaard vullen we hier de naam van je aangemelde Clerk-account in.</p>

              {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
              {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={handleSignOut} disabled={saving || signingOut} className="neo-button neo-button-ghost text-red-700 disabled:opacity-50">
                  {signingOut ? 'Uitloggen...' : 'Uitloggen'}
                </button>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setOpen(false)} disabled={saving || signingOut} className="neo-button neo-button-ghost disabled:opacity-50">
                    Sluiten
                  </button>
                  <button type="submit" disabled={loading || saving || signingOut || !displayName.trim()} className="neo-button neo-button-primary disabled:opacity-50">
                    {saving ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </SignedIn>
  );
}
