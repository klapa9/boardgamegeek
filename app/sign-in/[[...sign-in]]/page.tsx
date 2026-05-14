import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { ArrowLeft, DoorOpen, Dice5 } from 'lucide-react';

export default function SignInPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8">
        <div className="grid w-full gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="page-card page-card-peach overflow-hidden p-6 md:p-8">
            <Link
              href="/"
              className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft size={16} className="shrink-0" />
              Terug naar start
            </Link>

            <div className="mt-5 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-slate-950">
              <Dice5 size={16} className="shrink-0" />
              <span className="[overflow-wrap:anywhere]">boardgamegeek.be</span>
            </div>

            <p className="page-chip mt-4 w-fit">Inloggen</p>
            <h1 className="mt-4 font-poster text-[clamp(2.4rem,12vw,3.5rem)] uppercase leading-none text-slate-950">
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

            <div className="mt-6 inline-flex max-w-full flex-wrap items-center gap-2 rounded-[1.3rem] border-4 border-slate-950 bg-[#d8ff63] px-4 py-3 text-center font-poster text-lg uppercase text-slate-950 sm:text-xl">
              <DoorOpen size={22} className="shrink-0" />
              <span className="[overflow-wrap:anywhere]">Hier begint de echte app</span>
            </div>
          </section>

          <section className="page-card page-card-sky overflow-hidden p-4 md:p-6">
            <div className="overflow-hidden rounded-[1.6rem] border-2 border-slate-950 bg-white/85 p-3 md:p-4">
              <SignIn
                path="/sign-in"
                routing="path"
                fallbackRedirectUrl="/"
                appearance={{
                  elements: {
                    rootBox: 'w-full max-w-full',
                    card: 'w-full max-w-full bg-transparent shadow-none',
                    headerTitle: 'break-words',
                    headerSubtitle: 'break-words',
                    socialButtonsBlockButton: 'h-auto whitespace-normal break-words py-3',
                    socialButtonsBlockButtonText: 'whitespace-normal break-words text-center',
                    formButtonPrimary: 'h-auto whitespace-normal break-words py-3',
                    formFieldLabel: 'break-words',
                    footerActionText: 'break-words',
                    footerActionLink: 'break-words',
                    identityPreviewText: 'break-words',
                    formResendCodeLink: 'break-words',
                    otpCodeFieldInput: 'min-w-0'
                  }
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
