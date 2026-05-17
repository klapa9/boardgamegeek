import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { ArrowRight, CalendarDays, CircleAlert, Dice5, ExternalLink, Library, LogIn, Users } from 'lucide-react';

const featureCards = [
  {
    title: 'Spelavonden regelen zonder 48 berichten',
    text: 'Kies data, verzamel stemmen en spreek gemakkelijk af.',
    icon: CalendarDays,
    tone: 'bg-[#84d7ff]'
  },
  {
    title: 'Je BoardGameGeek-spellen slim organiseren',
    text: 'Haal je BGG-collectie binnen en maak er een bruikbare, catalogus van.',
    icon: Library,
    tone: 'bg-[#d8ff63]'
  },
  {
    title: 'Vrienden sneller rond een tafel krijgen',
    text: 'Gebouwd voor mensen die gewoon willen afspreken en spelen. Deel een spelavond gemakkelijk via je favoriete groepschat.',
    icon: Users,
    tone: 'bg-[#ffc7b8]'
  }
];

const chaoticFacts = [
  {
    eyebrow: 'Spelavond',
    text: 'Maak gemakkelijk een spelavond aan.',
    icon: CalendarDays,
    tone: 'bg-[#84d7ff]',
    tilt: 'sm:rotate-[-2deg] lg:translate-y-6'
  },
  {
    eyebrow: 'Collectie',
    text: 'Verdeel je collectie in zelfgemaakte categorieen.',
    icon: Library,
    tone: 'bg-[#d8ff63]'
  },
  {
    eyebrow: 'Spelkeuze',
    text: 'Laat je spelers op voorhand stemmen welk spel je zal spelen.',
    icon: Dice5,
    tone: 'bg-[#ffc7b8]',
    tilt: 'sm:rotate-[-2deg] lg:translate-y-10'
  },
  {
    eyebrow: 'Planning',
    text: 'Laat je spelers stemmen voor de ideale datum.',
    icon: Users,
    tone: 'bg-white',
    tilt: 'sm:rotate-[2deg] lg:-translate-y-1'
  }
];

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
  const heroRibbonItems = [
    'boardgamegeek.be',
    'spelen plannen',
    'collectie bruikbaar maken',
    'vrienden rond de tafel',
    'boardgamegeek.be',
    'spelen plannen',
    'collectie bruikbaar maken',
    'vrienden rond de tafel'
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
          <>
            <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] shadow-[0_24px_80px_rgba(23,32,54,0.18)]">
              <div className="flex items-center gap-2 border-b-4 border-dashed border-slate-950 bg-[#fff2bd] px-4 py-3 sm:gap-3 sm:px-6">
                <div className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-700 sm:text-xs sm:tracking-[0.18em]">
                  <CircleAlert size={16} />
                  <span>ingelogd</span>
                </div>
                <div className="home-float inline-flex min-w-0 flex-1 items-center rounded-full border-2 border-slate-950 bg-[#ff5a36] px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white sm:px-4 sm:py-1 sm:text-xs sm:tracking-[0.18em]">
                  <span className="[overflow-wrap:anywhere]">boardgamegeek.be</span>
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
          </>
        ) : (
          <>
            <section className="relative w-full min-w-0 overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] shadow-[0_24px_80px_rgba(23,32,54,0.18)]">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="home-spotlight absolute left-[-3rem] top-[-4rem] h-52 w-52 rounded-full bg-[#ff5a36]/18 blur-3xl" />
                <div className="home-orbit absolute right-[-3rem] top-8 h-40 w-40 rounded-full border-2 border-slate-950/20" />
                <div className="home-orbit-delayed absolute bottom-6 right-[18%] h-24 w-24 rounded-full border-2 border-[#84d7ff]/80" />
                <div className="home-drift absolute bottom-[-2rem] left-[15%] h-28 w-28 rounded-full bg-[#d8ff63]/22 blur-2xl" />
              </div>

              <div className="relative grid gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:gap-8">
                <div className="max-w-3xl space-y-5">
                  <Link
                    href={primaryHref}
                    className="group inline-flex max-w-full overflow-hidden rounded-[1.8rem] border-4 border-slate-950 bg-[#ff5a36] text-white shadow-[0_10px_0_0_#172036] transition hover:translate-y-[-3px] hover:bg-[#ff6d4d]"
                  >
                    <span className="home-ribbon-track flex min-w-max items-center gap-4 px-4 py-3 font-poster text-[clamp(1.15rem,5vw,2.2rem)] uppercase leading-none">
                      <Dice5 size={24} className="shrink-0" />
                      {heroRibbonItems.map((item, index) => (
                        <span key={`${item}-${index}`} className={index % 2 === 0 ? 'text-white' : 'text-[#fff2bd]'}>
                          {item}
                        </span>
                      ))}
                    </span>
                  </Link>

                  <Link
                    href={primaryHref}
                    className="group block rounded-[1.7rem] border-2 border-slate-950 bg-white/80 px-5 py-5 shadow-[0_10px_0_0_rgba(23,32,54,0.08)] transition hover:translate-y-[-4px] hover:bg-white"
                  >
                    <p className="max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
                      Dit is de praktische site waar je bordspelavonden regelt, je
                      BoardGameGeek-collectie bruikbaar maakt en vrienden sneller rond een tafel krijgt.
                    </p>
                  </Link>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={primaryHref}
                      className="home-bob inline-flex items-center rounded-full border-2 border-slate-950 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:translate-y-[-2px]"
                    >
                      stemmen zonder chaos
                    </Link>
                    <Link
                      href={primaryHref}
                      className="home-bob inline-flex items-center rounded-full border-2 border-slate-950 bg-[#d8ff63] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition [animation-delay:180ms] hover:translate-y-[-2px]"
                    >
                      collectie meteen bruikbaar
                    </Link>
                    <Link
                      href={primaryHref}
                      className="home-bob inline-flex items-center rounded-full border-2 border-slate-950 bg-[#84d7ff] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition [animation-delay:360ms] hover:translate-y-[-2px]"
                    >
                      sneller aan tafel
                    </Link>
                  </div>

                  <Link
                    href={primaryHref}
                    className="inline-flex w-full max-w-full flex-wrap items-center justify-center gap-3 rounded-[1.8rem] border-4 border-slate-950 bg-[#172036] px-5 py-4 text-center font-poster text-xl uppercase text-[#fff7df] shadow-[0_10px_0_0_#ff5a36] transition hover:translate-y-[-3px] hover:bg-[#25314d] sm:w-auto sm:px-7 sm:text-2xl"
                  >
                    <LogIn size={24} className="shrink-0" />
                    <span className="[overflow-wrap:anywhere]">Log in</span>
                    <ArrowRight size={24} className="shrink-0" />
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {chaoticFacts.map(({ eyebrow, text, icon: Icon, tone, tilt }, index) => (
                    <Link
                      key={text}
                      href={primaryHref}
                      className={`home-card-sway group relative overflow-hidden rounded-[1.7rem] border-4 border-slate-950 ${tone} p-4 shadow-[0_12px_0_0_#172036] transition hover:translate-y-[-6px] ${tilt ?? ''}`}
                      style={{ animationDelay: `${index * 180}ms` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-2 bg-white/35" />
                      <div className="flex min-h-[13rem] flex-col justify-between gap-5">
                        <div className="inline-flex w-fit rounded-[1.2rem] border-2 border-slate-950 bg-white p-3 text-slate-950">
                          <Icon size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">{eyebrow}</p>
                          <p className="mt-3 text-base font-black leading-7 text-slate-950 sm:text-lg">{text}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 grid w-full min-w-0 gap-4 lg:grid-cols-3">
              {featureCards.map(({ title, text, icon: Icon, tone }) => (
                <Link
                  key={title}
                  href={primaryHref}
                  className={`group rounded-[1.8rem] border-4 border-slate-950 ${tone} p-4 shadow-[0_10px_0_0_#172036] transition hover:translate-y-[-4px] sm:p-5`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border-2 border-slate-950 bg-white p-3 text-slate-950">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-poster text-2xl uppercase leading-tight text-slate-950 [overflow-wrap:anywhere]">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-800">{text}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          </>
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
