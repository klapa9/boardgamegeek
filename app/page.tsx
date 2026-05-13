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
  'Maak gemakkelijk een spelavond aan.',
  'Verdeel je collectie in zelfgemaakte categoriën.',
  'Laat je spelers op voorhand stemmen welk spel je zal spelen.',
  'Laat je spelers stemmen voor de ideale datum.'
];

export default async function HomePage() {
  const { userId } = await auth();
  const primaryHref = userId ? '/spelavonden' : '/sign-in';

  return (
    <main className="home-noise min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-4rem] top-24 h-40 w-40 rounded-full bg-[#ff5a36]/20 blur-3xl" />
        <div className="absolute right-[-3rem] top-56 h-48 w-48 rounded-full bg-[#84d7ff]/30 blur-3xl" />
        <div className="absolute bottom-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#d8ff63]/20 blur-3xl" />
      </div>

      <div className="border-b-4 border-slate-950 bg-[#172036] py-3 text-[#fff7df]">
        <div className="home-marquee flex min-w-max gap-6 whitespace-nowrap px-4 font-poster text-lg uppercase tracking-[0.2em]">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index}>Dit is niet boardgamegeek.com</span>
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3.75rem)] max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[rgba(255,247,223,0.92)] shadow-[0_24px_80px_rgba(23,32,54,0.18)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-dashed border-slate-950 bg-[#fff2bd] px-4 py-3 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-slate-950">
              <Dice5 size={16} />
              <span>boardgamegeek.be</span>
            </div>
            <div className="home-float rounded-full border-2 border-slate-950 bg-[#ff5a36] px-4 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
              Gemaakt door en voor geeks.
            </div>
          </div>

          <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-slate-950 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700">
                <CircleAlert size={16} />
                <span>deze site is wel voor board game geeks</span>
              </div>

              <div>
                <p className="font-poster text-[clamp(3.2rem,14vw,7.5rem)] uppercase leading-[0.88] text-slate-950">
                  Dit is
                  <br />
                  niet
                  <br />
                  boardgamegeek.com.
                </p>
                <p className="mt-4 max-w-2xl text-lg leading-7 text-slate-700 sm:text-xl">
                  Dit is de praktische zij-ingang waar je bordspelavonden regelt, je
                  BoardGameGeek-collectie bruikbaar maakt en vrienden sneller rond een tafel krijgt.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {chaoticFacts.map((fact) => (
                  <div key={fact} className="rounded-[1.5rem] border-2 border-slate-950 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-soft">
                    {fact}
                  </div>
                ))}
              </div>

              <Link
                href={primaryHref}
                className="inline-flex w-full items-center justify-center gap-3 rounded-[1.8rem] border-4 border-slate-950 bg-[#ff5a36] px-5 py-4 text-center font-poster text-2xl uppercase text-white shadow-[0_10px_0_0_#172036] transition hover:translate-y-[-3px] hover:bg-[#ff6d4d] sm:w-auto sm:px-7"
              >
                <LogIn size={24} />
                <span>Log in, vreemde bordspelheld</span>
                <ArrowRight size={24} />
              </Link>
            </div>

            <aside className="space-y-4">
              <div className="home-bob rounded-[1.8rem] border-4 border-slate-950 bg-[#172036] p-4 text-[#fff7df] shadow-[0_16px_0_0_#0f172a] sm:p-5">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#84d7ff]">Hoofdmissie</p>
                <h2 className="mt-2 font-poster text-4xl uppercase leading-none sm:text-5xl">Log in om verder te gaan</h2>
                <p className="mt-3 text-sm leading-6 text-[#fff7df]/85 sm:text-base">
                  Deze hele pagina bestaat eigenlijk om je met liefde, drama en overduidelijkheid naar die ene knop te
                  sturen.
                </p>

                <Link
                  href={primaryHref}
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.7rem] border-4 border-slate-950 bg-[#d8ff63] px-5 py-5 text-center font-poster text-2xl uppercase text-slate-950 transition hover:translate-y-[-2px] hover:bg-[#ecff9a] sm:text-3xl"
                >
                  <LogIn size={26} />
                  <span>Log in om verder te gaan</span>
                  <ArrowRight size={26} />
                </Link>

                <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-[#fff7df]">
                  {userId
                    ? 'Je bent al ingelogd. Deze knop doet dus gewoon alsof hij een login is en brengt je meteen verder.'
                    : 'Na het inloggen kun je spelavonden opzetten, je BGG-spellen ordenen en mensen verzamelen zonder digitale paniek.'}
                </p>
              </div>

              <div className="rounded-[1.7rem] border-2 border-slate-950 bg-[#ffc7b8] p-4 shadow-soft">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">Wat deze site wel is</p>
                <p className="mt-2 text-base leading-7 text-slate-800">
                  Een vriendelijke machine voor: data prikken, spelkeuzes verzamelen, jouw collectie slim inzetten en
                  mensen effectief laten opdagen.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
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
                  <h3 className="font-poster text-2xl uppercase leading-tight text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-800">{text}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] border-4 border-slate-950 bg-white px-4 py-5 shadow-soft sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Samengevat voor haastige mensen</p>
              <h2 className="mt-2 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">
                Niet boardgamegeek.com
                <br />
                Wel een hulpmiddel om gemakkelijker af te spreken.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700 sm:text-lg">
                Boardgamegeek.be helpt je om van “ooit eens afspreken” naar “vrijdag 19:30, laten we gaan” te geraken.
              </p>
            </div>

            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center gap-3 rounded-[1.7rem] border-4 border-slate-950 bg-[#ff5a36] px-6 py-5 text-center font-poster text-2xl uppercase text-white transition hover:scale-[1.01] hover:bg-[#ff6d4d] sm:text-3xl"
            >
              <span>Log in om verder te gaan</span>
              <ArrowRight size={28} />
            </Link>
          </div>
        </section>

        <footer className="mt-6 rounded-[2rem] border-4 border-slate-950 bg-[#172036] px-4 py-5 text-[#fff7df] shadow-soft sm:px-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#84d7ff]">Officiële verwijzing, geen identiteitsfraude</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl text-sm leading-6 text-[#fff7df]/88">
              Deze site is bedoeld als handige compagnon voor je BoardGameGeek-collectie en spelplanning, maar is niet
              dezelfde website als BoardGameGeek.com.
            </div>

            <a
              href="https://boardgamegeek.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 rounded-[1.5rem] border-2 border-[#fff7df] bg-white px-4 py-3 text-slate-950 transition hover:bg-[#fff7df]"
            >
              <img
                src="https://cf.geekdo-static.com/images/logos/navbar-logo-bgg-b2.svg"
                alt="Official BoardGameGeek.com logo"
                className="h-8 w-auto"
              />
              <span className="text-sm font-black uppercase tracking-[0.16em]">Bezoek boardgamegeek.com</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
