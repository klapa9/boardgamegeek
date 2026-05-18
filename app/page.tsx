import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { CircleAlert, ExternalLink, LogIn } from 'lucide-react';

export default async function HomePage() {
  const { userId } = await auth();
  const primaryHref = userId ? '/spelavonden' : '/sign-in';
  const marqueeItems = userId
    ? Array.from({ length: 8 }, () => 'boardgamegeek.be')
    : [
        'boardgamegeek.be',
        'plan samen',
        'stem op spellen',
        'kies je datum',
        'speel sneller',
        'boardgamegeek.be',
        'plan samen',
        'stem op spellen'
      ];

  return (
    <main className="home-noise min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-4rem] top-24 h-40 w-40 rounded-full bg-[#ff5a36]/20 blur-3xl" />
        <div className="absolute right-[-3rem] top-56 h-48 w-48 rounded-full bg-[#84d7ff]/30 blur-3xl" />
        <div className="absolute bottom-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#d8ff63]/20 blur-3xl" />
      </div>

      <div className="border-b-4 border-slate-950 bg-[#172036] py-3 text-[#fff7df]">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="home-marquee flex min-w-max gap-6 whitespace-nowrap font-poster text-base uppercase tracking-[0.18em] sm:text-lg sm:tracking-[0.2em]">
              {marqueeItems.map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3.75rem)] w-full max-w-6xl min-w-0 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {userId ? (
          <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] shadow-[0_24px_80px_rgba(23,32,54,0.18)]">
            <div className="border-b-4 border-dashed border-slate-950 bg-[#fff2bd] px-4 py-3 sm:px-6">
              <div className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-700 sm:text-xs sm:tracking-[0.18em]">
                <CircleAlert size={16} />
                <span>ingelogd</span>
              </div>
            </div>

            <div className="px-4 py-5 sm:px-6 sm:py-8">
              <div className="max-w-3xl">
                <h1 className="mt-4 font-poster text-[clamp(2.2rem,10vw,4.4rem)] uppercase leading-[0.92] text-slate-950">
                  Kies je
                  <br />
                  volgende zet.
                </h1>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/spelavond?nieuw=1"
                    className="inline-flex items-center justify-center rounded-[1.4rem] border-4 border-slate-950 bg-[#ff5a36] px-5 py-3 text-center font-poster text-xl uppercase text-white transition hover:translate-y-[-2px] hover:bg-[#ff6d4d]"
                  >
                    Maak een nieuwe spelavond
                  </Link>
                  <Link
                    href="/collectie"
                    className="inline-flex items-center justify-center rounded-[1.4rem] border-4 border-slate-950 bg-[#84d7ff] px-5 py-3 text-center font-poster text-xl uppercase text-slate-950 transition hover:translate-y-[-2px]"
                  >
                    Mijn collectie
                  </Link>
                  <Link
                    href="/spelavonden"
                    className="inline-flex items-center justify-center rounded-[1.4rem] border-4 border-slate-950 bg-[#d8ff63] px-5 py-3 text-center font-poster text-xl uppercase text-slate-950 transition hover:translate-y-[-2px]"
                  >
                    Mijn spelavonden
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="relative flex w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] shadow-[0_24px_80px_rgba(23,32,54,0.18)]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="home-spotlight absolute left-[-3rem] top-[-4rem] h-52 w-52 rounded-full bg-[#ff5a36]/18 blur-3xl" />
              <div className="home-orbit absolute right-[-3rem] top-8 h-40 w-40 rounded-full border-2 border-slate-950/20" />
              <div className="home-orbit-delayed absolute bottom-6 right-[18%] h-24 w-24 rounded-full border-2 border-[#84d7ff]/80" />
              <div className="home-drift absolute bottom-[-2rem] left-[15%] h-28 w-28 rounded-full bg-[#d8ff63]/22 blur-2xl" />
            </div>

            <div className="relative w-full max-w-xl px-4 py-8 sm:px-6 sm:py-12">
              <div className="rounded-[1.9rem] border-4 border-slate-950 bg-white/90 px-5 py-6 shadow-[0_12px_0_0_rgba(23,32,54,0.14)] sm:px-7 sm:py-8">
                <p className="page-chip w-fit">Welkom</p>
                <h1 className="mt-4 font-poster text-[clamp(2.3rem,12vw,4.2rem)] uppercase leading-[0.92] text-slate-950">
                  Log in en plan sneller.
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                  Meld je aan om spelavonden te organiseren, je collectie te beheren en vrienden eenvoudig te laten
                  meestemmen.
                </p>
                <Link
                  href={primaryHref}
                  className="mt-6 inline-flex min-h-[4rem] w-full items-center justify-center gap-3 rounded-[1.8rem] border-4 border-slate-950 bg-[#172036] px-5 py-4 text-center font-poster text-xl uppercase text-[#fff7df] shadow-[0_10px_0_0_#ff5a36] transition hover:translate-y-[-3px] hover:bg-[#25314d] sm:text-2xl"
                >
                  <LogIn size={24} className="shrink-0" />
                  <span className="[overflow-wrap:anywhere]">Log in</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-6 w-full min-w-0 rounded-[2rem] border-4 border-slate-950 bg-[#172036] px-4 py-5 text-[#fff7df] shadow-soft sm:px-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#84d7ff]">Officiele verwijzing, geen identiteitsfraude</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl text-sm leading-6 text-[#fff7df]/88">
              Deze site is bedoeld als handige compagnon voor je BoardGameGeek-collectie en spelplanning, maar is niet
              dezelfde website als BoardGameGeek.com.
            </div>

            <a
              href="https://boardgamegeek.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full flex-wrap items-center justify-center gap-3 rounded-[1.5rem] border-2 border-[#fff7df] bg-white px-4 py-3 text-center text-slate-950 transition hover:bg-[#fff7df] sm:flex-nowrap sm:text-left"
            >
              <img
                src="https://cf.geekdo-static.com/images/logos/navbar-logo-bgg-b2.svg"
                alt="Official BoardGameGeek.com logo"
                className="h-8 w-auto"
              />
              <span className="text-sm font-black uppercase tracking-[0.16em] [overflow-wrap:anywhere]">Bezoek boardgamegeek.com</span>
              <ExternalLink size={16} className="shrink-0" />
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
