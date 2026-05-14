import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { ArrowLeft, DoorOpen, Dice5 } from 'lucide-react';

export default function SignInPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8">
        <div className="grid w-full gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="page-card page-card-peach p-6 md:p-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Terug naar start
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-slate-950">
              <Dice5 size={16} />
              <span>boardgamegeek.be</span>
            </div>

            <p className="page-chip mt-4 w-fit">Inloggen</p>
            <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 md:text-5xl">
              Log in
              <br />
              en speel verder.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-700 md:text-lg">
              De homepage mag publiek gek doen. De echte app houden we achter login, zodat je collectie, planning en
              spelavonden netjes aan jouw account vasthangen.
            </p>

            <div className="mt-6 space-y-3">
              <div className="page-subcard px-4 py-3 text-sm font-bold text-slate-800">
                Organiseer gemakkelijk spelavonden.
              </div>
              <div className="page-subcard px-4 py-3 text-sm font-bold text-slate-800">
                Gebruik je BoardGameGeek-spellen zonder chaos.
              </div>
              <div className="page-subcard px-4 py-3 text-sm font-bold text-slate-800">
                Spelavond-links blijven publiek bereikbaar.
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-[1.3rem] border-4 border-slate-950 bg-[#d8ff63] px-4 py-3 font-poster text-xl uppercase text-slate-950">
              <DoorOpen size={22} />
              <span>Hier begint de echte app</span>
            </div>
          </section>

          <section className="page-card page-card-sky p-4 md:p-6">
            <div className="rounded-[1.6rem] border-2 border-slate-950 bg-white/85 p-3 md:p-4">
              <SignIn
                path="/sign-in"
                routing="path"
                fallbackRedirectUrl="/"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
